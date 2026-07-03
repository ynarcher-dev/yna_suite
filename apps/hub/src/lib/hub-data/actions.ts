"use server";

import { EDITABLE_STARTUP_FIELDS, type StartupEditInput } from "./masters";
import { mockCreateStartup, mockGetStartupDetail, mockUpdateStartup, type FieldChange } from "./mock-store";
import {
  actorName,
  guardConfigured,
  norm,
  revalidateMaster,
  runAddAlias,
  runAddIdentifier,
  runSetStatus,
} from "./action-helpers";
import type { ActionResult } from "./types";

/**
 * Hub 스타트업 마스터 변경 서버 액션.
 * (근거: yna_suite_api_contracts.md §7·9~11, functional_spec §7 완료 기준)
 *
 * 안전장치: 변경 사유 필수, merged source 수정 제한, 변경 필드마다 field_history 기록,
 * audit log 기록. 최종 보안은 RLS. dev 폴백에서는 mock 스토어를 갱신한다(이슈21).
 */

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
  revalidateMaster("/startups", args.id);
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
  return runAddIdentifier("startup", "/startups", mockGetStartupDetail(args.id), args);
}

export async function addAlias(args: {
  id: string;
  aliasType: string;
  aliasValue: string;
  reason: string;
}): Promise<ActionResult> {
  return runAddAlias("startup", "/startups", mockGetStartupDetail(args.id), args);
}

export async function setStartupStatus(args: {
  id: string;
  status: "active" | "archived";
  reason: string;
}): Promise<ActionResult> {
  return runSetStatus("startup", "/startups", mockGetStartupDetail(args.id), args);
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
  revalidateMaster("/startups");
  return { ok: true, createdId: created.id };
}
