"use server";

import { revalidatePath } from "next/cache";
import {
  normalizeBusinessNumber,
  normalizeCompanyName,
  normalizeEmail,
  normalizePhone,
  normalizeWebsiteDomain,
} from "@yna/utils";
import { getSession } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/auth/env";
import { EDITABLE_STARTUP_FIELDS, type StartupEditInput } from "./masters";
import {
  mockAddAlias,
  mockAddIdentifier,
  mockCreateStartup,
  mockGetStartupDetail,
  mockSetStartupStatus,
  mockUpdateStartup,
  type FieldChange,
} from "./mock-store";
import type { ActionResult } from "./types";

/**
 * Hub 스타트업 마스터 변경 서버 액션.
 * (근거: yna_suite_api_contracts.md §7·9~11, functional_spec §7 완료 기준)
 *
 * 안전장치: 변경 사유 필수, merged source 수정 제한, 변경 필드마다 field_history 기록,
 * audit log 기록. 최종 보안은 RLS. dev 폴백에서는 mock 스토어를 갱신한다(이슈21).
 */

async function actorName(): Promise<string> {
  const session = await getSession();
  return session?.shellUser.name ?? "알 수 없음";
}

function guardConfigured(): ActionResult | null {
  if (isSupabaseConfigured) {
    return {
      ok: false,
      error: "Hub 마스터 변경의 Supabase 연동은 Docker/staging 에서 연결 예정입니다(이슈21).",
    };
  }
  return null;
}

function norm(v: string | null | undefined): string | null {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
}

export async function updateStartupBasic(args: {
  id: string;
  values: Record<string, string | null>;
  reason: string;
}): Promise<ActionResult> {
  const blocked = guardConfigured();
  if (blocked) return blocked;
  if (!args.reason.trim()) return { ok: false, error: "변경 사유를 입력하세요." };

  const detail = mockGetStartupDetail(args.id);
  if (!detail) return { ok: false, error: "마스터를 찾을 수 없습니다." };
  if (detail.master.status === "merged") {
    return { ok: false, error: "병합된(merged) 마스터는 수정할 수 없습니다." };
  }

  const before = extractCurrent(detail.master);
  const next = {} as StartupEditInput;
  const changes: FieldChange[] = [];
  for (const f of EDITABLE_STARTUP_FIELDS) {
    const nextVal = norm(args.values[f.key]);
    next[f.key] = nextVal;
    if ((before[f.key] ?? null) !== nextVal) {
      changes.push({ fieldName: f.key, oldValue: before[f.key] ?? null, newValue: nextVal });
    }
  }
  if (changes.length === 0) return { ok: false, error: "변경된 내용이 없습니다." };
  if (!next.name) return { ok: false, error: "표시명은 비울 수 없습니다." };

  mockUpdateStartup(args.id, next, changes, await actorName(), args.reason.trim());
  revalidate(args.id);
  return { ok: true };
}

function extractCurrent(m: {
  name: string;
  legalName: string | null;
  representativeName: string | null;
  businessNumber: string | null;
  corporationNumber: string | null;
  phone: string | null;
  email: string | null;
  websiteUrl: string | null;
  address: string | null;
  industry: string | null;
  stage: string | null;
}): StartupEditInput {
  return {
    name: m.name,
    legalName: m.legalName,
    representativeName: m.representativeName,
    businessNumber: m.businessNumber,
    corporationNumber: m.corporationNumber,
    phone: m.phone,
    email: m.email,
    websiteUrl: m.websiteUrl,
    address: m.address,
    industry: m.industry,
    stage: m.stage,
  };
}

export async function addIdentifier(args: {
  id: string;
  identifierType: string;
  identifierValue: string;
  reason: string;
}): Promise<ActionResult> {
  const blocked = guardConfigured();
  if (blocked) return blocked;
  if (!args.identifierValue.trim()) return { ok: false, error: "식별자 값을 입력하세요." };
  if (!args.reason.trim()) return { ok: false, error: "변경 사유를 입력하세요." };

  const detail = mockGetStartupDetail(args.id);
  if (!detail) return { ok: false, error: "마스터를 찾을 수 없습니다." };
  if (detail.master.status === "merged") {
    return { ok: false, error: "병합된 마스터는 수정할 수 없습니다." };
  }

  const value = args.identifierValue.trim();
  const normalized = normalizeIdentifier(args.identifierType, value);
  const dup = detail.identifiers.some(
    (i) => i.identifierType === args.identifierType && i.normalizedValue === normalized,
  );
  if (dup) return { ok: false, error: "이미 등록된 식별자입니다." };

  mockAddIdentifier(args.id, args.identifierType, value, normalized, await actorName(), args.reason.trim());
  revalidate(args.id);
  return { ok: true };
}

function normalizeIdentifier(type: string, value: string): string {
  switch (type) {
    case "business_number":
    case "corporation_number":
      return normalizeBusinessNumber(value);
    case "founder_phone":
      return normalizePhone(value);
    case "founder_email":
      return normalizeEmail(value);
    case "website_domain":
      return normalizeWebsiteDomain(value);
    default:
      return value.trim().toLowerCase();
  }
}

export async function addAlias(args: {
  id: string;
  aliasType: string;
  aliasValue: string;
  reason: string;
}): Promise<ActionResult> {
  const blocked = guardConfigured();
  if (blocked) return blocked;
  if (!args.aliasValue.trim()) return { ok: false, error: "별칭을 입력하세요." };
  if (!args.reason.trim()) return { ok: false, error: "변경 사유를 입력하세요." };

  const detail = mockGetStartupDetail(args.id);
  if (!detail) return { ok: false, error: "마스터를 찾을 수 없습니다." };
  if (detail.master.status === "merged") {
    return { ok: false, error: "병합된 마스터는 수정할 수 없습니다." };
  }

  const value = args.aliasValue.trim();
  const normalized = normalizeCompanyName(value);
  const dup = detail.aliases.some(
    (a) => a.aliasType === args.aliasType && a.normalizedValue === normalized,
  );
  if (dup) return { ok: false, error: "이미 등록된 별칭입니다." };

  mockAddAlias(args.id, args.aliasType, value, normalized, await actorName(), args.reason.trim());
  revalidate(args.id);
  return { ok: true };
}

export async function setStartupStatus(args: {
  id: string;
  status: "active" | "archived";
  reason: string;
}): Promise<ActionResult> {
  const blocked = guardConfigured();
  if (blocked) return blocked;
  if (!args.reason.trim()) return { ok: false, error: "변경 사유를 입력하세요." };

  const detail = mockGetStartupDetail(args.id);
  if (!detail) return { ok: false, error: "마스터를 찾을 수 없습니다." };
  if (detail.master.status === "merged") {
    return { ok: false, error: "병합된 마스터의 상태는 변경할 수 없습니다." };
  }

  mockSetStartupStatus(args.id, args.status, await actorName(), args.reason.trim());
  revalidate(args.id);
  return { ok: true };
}

export async function createStartup(args: {
  name: string;
  legalName?: string | null;
  representativeName?: string | null;
  businessNumber?: string | null;
  phone?: string | null;
  email?: string | null;
}): Promise<ActionResult> {
  const blocked = guardConfigured();
  if (blocked) return blocked;
  if (!args.name.trim()) return { ok: false, error: "표시명을 입력하세요." };

  const created = mockCreateStartup(
    {
      name: args.name.trim(),
      legalName: norm(args.legalName),
      representativeName: norm(args.representativeName),
      businessNumber: norm(args.businessNumber),
      phone: norm(args.phone),
      email: norm(args.email),
      sourceDomain: "hub",
    },
    await actorName(),
  );
  revalidate();
  return { ok: true, createdId: created.id };
}

function revalidate(id?: string): void {
  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/startups");
  if (id) revalidatePath(`/startups/${id}`);
}
