"use server";

import { EDITABLE_PARTNER_FIELDS } from "./masters";
import { mockGetPartnerDetail } from "./mock-masters";
import { updateMasterFields, type FieldChange } from "./mock-store";
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
 * Hub 협력사 마스터 변경 서버 액션. (근거: functional_spec §9, api_contracts §9~11)
 * partner_type 관리 + 사업자번호 식별자를 중복 후보에 강하게 반영(중복 후보 생성은 Phase 1.10).
 * 안전장치·감사·merged 제한은 공통 runner 를 재사용한다. dev 폴백은 mock 스토어를 갱신한다(이슈21).
 */

export async function updatePartnerBasic(args: {
  id: string;
  values: Record<string, string | null>;
  reason: string;
}): Promise<ActionResult> {
  const blocked = guardConfigured();
  if (blocked) return blocked;
  if (!args.reason.trim()) return { ok: false, error: "변경 사유를 입력하세요." };

  const detail = mockGetPartnerDetail(args.id);
  if (!detail) return { ok: false, error: "마스터를 찾을 수 없습니다." };
  if (detail.master.status === "merged") {
    return { ok: false, error: "병합된 마스터는 수정할 수 없습니다." };
  }

  const master = detail.master;
  const patch: Record<string, unknown> = {};
  const changes: FieldChange[] = [];
  for (const f of EDITABLE_PARTNER_FIELDS) {
    const nextVal = norm(args.values[f.key]);
    const prevVal = (master[f.key] as string | null) ?? null;
    patch[f.key] = nextVal;
    if (prevVal !== nextVal) changes.push({ fieldName: f.key, oldValue: prevVal, newValue: nextVal });
  }

  if (changes.length === 0) return { ok: false, error: "변경된 내용이 없습니다." };
  if (!norm(args.values.name)) return { ok: false, error: "기관명은 비울 수 없습니다." };

  updateMasterFields("partner", args.id, patch, changes, await actorName(), args.reason.trim());
  revalidateMaster("/partners", args.id);
  return { ok: true };
}

export async function addPartnerIdentifier(args: {
  id: string;
  identifierType: string;
  identifierValue: string;
  reason: string;
}): Promise<ActionResult> {
  return runAddIdentifier("partner", "/partners", mockGetPartnerDetail(args.id), args);
}

export async function addPartnerAlias(args: {
  id: string;
  aliasType: string;
  aliasValue: string;
  reason: string;
}): Promise<ActionResult> {
  return runAddAlias("partner", "/partners", mockGetPartnerDetail(args.id), args);
}

export async function setPartnerStatus(args: {
  id: string;
  status: "active" | "archived";
  reason: string;
}): Promise<ActionResult> {
  return runSetStatus("partner", "/partners", mockGetPartnerDetail(args.id), args);
}
