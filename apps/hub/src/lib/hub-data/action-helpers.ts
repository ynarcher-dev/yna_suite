import "server-only";
import { revalidatePath } from "next/cache";
import { normalizeCompanyName } from "@yna/utils";
import { getSession } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/auth/env";
import { normalizeIdentifierValue } from "./masters";
import {
  addAliasRow,
  addIdentifierRow,
  findAlias,
  findIdentifier,
  findMasterRef,
  removeAlias,
  removeIdentifier,
  resolveEntityType,
  revealIdentifier,
  setIdentifierPrimary,
  setIdentifierVerification,
  setMasterStatus,
  type MasterEntity,
  type SubMutResult,
} from "./mock-store";
import type { ActionResult, IdentifierVerifiedStatus } from "./types";

/** 마스터 엔티티별 목록 경로(재검증용). */
export const LIST_PATH: Record<MasterEntity, string> = {
  startup: "/startups",
  expert: "/experts",
  partner: "/partners",
};

/**
 * Hub 마스터 변경 서버 액션의 공통 헬퍼(스타트업/전문가/협력사 공용).
 * (근거: yna_suite_api_contracts.md §7·9~11, 4_memo 이슈21)
 */

export async function actorName(): Promise<string> {
  const session = await getSession();
  return session?.shellUser.name ?? "알 수 없음";
}

/** Supabase 설정 시(운영/스테이징) 미완성 실데이터 경로를 명시적으로 막는다(이슈21). */
export function guardConfigured(): ActionResult | null {
  if (isSupabaseConfigured) {
    return {
      ok: false,
      error: "Hub 마스터 변경의 Supabase 연동은 Docker/staging 에서 연결 예정입니다(이슈21).",
    };
  }
  return null;
}

/** 빈 문자열은 null 로 정리한다. */
export function norm(v: string | null | undefined): string | null {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
}

/** 식별자 유형별 normalized_value 생성. (data_quality: 원본 보존 + 정규화 저장) */
export const normalizeIdentifier = normalizeIdentifierValue;

/** 목록/검색/상세 경로를 재검증한다. */
export function revalidateMaster(listPath: string, id?: string): void {
  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath(listPath);
  if (id) revalidatePath(`${listPath}/${id}`);
}

/** 상세 화면의 공통 서브테이블(식별자/별칭 중복 방지·merged 제한 판단에 사용). */
interface DetailLike {
  master: { status: string };
  identifiers: { identifierType: string; normalizedValue: string }[];
  aliases: { aliasType: string; normalizedValue: string }[];
}

/** merged 마스터 수정 제한 + 사유 필수 공통 가드. */
function guardWritable(detail: DetailLike | null, reason: string): ActionResult | null {
  if (!reason.trim()) return { ok: false, error: "변경 사유를 입력하세요." };
  if (!detail) return { ok: false, error: "마스터를 찾을 수 없습니다." };
  if (detail.master.status === "merged") {
    return { ok: false, error: "병합된 마스터는 수정할 수 없습니다." };
  }
  return null;
}

/** 식별자 추가 공통 처리(원본 보존 + normalized 생성 + 중복 방지 + audit). */
export async function runAddIdentifier(
  entityType: MasterEntity,
  listPath: string,
  detail: DetailLike | null,
  args: { id: string; identifierType: string; identifierValue: string; reason: string },
): Promise<ActionResult> {
  const blocked = guardConfigured();
  if (blocked) return blocked;
  if (!args.identifierValue.trim()) return { ok: false, error: "식별자 값을 입력하세요." };
  const guard = guardWritable(detail, args.reason);
  if (guard) return guard;

  const value = args.identifierValue.trim();
  const normalized = normalizeIdentifier(args.identifierType, value);
  const dup = detail!.identifiers.some(
    (i) => i.identifierType === args.identifierType && i.normalizedValue === normalized,
  );
  if (dup) return { ok: false, error: "이미 등록된 식별자입니다." };

  addIdentifierRow(entityType, args.id, args.identifierType, value, normalized, await actorName(), args.reason.trim());
  revalidateMaster(listPath, args.id);
  return { ok: true };
}

/** 별칭 추가 공통 처리(normalized 생성 + 중복 방지 + audit). */
export async function runAddAlias(
  entityType: MasterEntity,
  listPath: string,
  detail: DetailLike | null,
  args: { id: string; aliasType: string; aliasValue: string; reason: string },
): Promise<ActionResult> {
  const blocked = guardConfigured();
  if (blocked) return blocked;
  if (!args.aliasValue.trim()) return { ok: false, error: "별칭을 입력하세요." };
  const guard = guardWritable(detail, args.reason);
  if (guard) return guard;

  const value = args.aliasValue.trim();
  const normalized = normalizeCompanyName(value);
  const dup = detail!.aliases.some(
    (a) => a.aliasType === args.aliasType && a.normalizedValue === normalized,
  );
  if (dup) return { ok: false, error: "이미 등록된 별칭입니다." };

  addAliasRow(entityType, args.id, args.aliasType, value, normalized, await actorName(), args.reason.trim());
  revalidateMaster(listPath, args.id);
  return { ok: true };
}

/** 상태 변경(활성 ↔ 보관) 공통 처리(사유 필수 + field_history + audit). */
export async function runSetStatus(
  entityType: MasterEntity,
  listPath: string,
  detail: DetailLike | null,
  args: { id: string; status: "active" | "archived"; reason: string },
): Promise<ActionResult> {
  const blocked = guardConfigured();
  if (blocked) return blocked;
  const guard = guardWritable(detail, args.reason);
  if (guard) return guard;

  setMasterStatus(entityType, args.id, args.status, await actorName(), args.reason.trim());
  revalidateMaster(listPath, args.id);
  return { ok: true };
}

// ---- sub-record(식별자/별칭) 변경 공통 runner (엔티티 공용, id 로 소유 마스터 역참조) ----

/** 변경 사유 + merged 마스터 제한 공통 가드(엔티티 id 기준). */
function guardSubWritable(entityId: string, reason: string): ActionResult | null {
  if (!reason.trim()) return { ok: false, error: "변경 사유를 입력하세요." };
  const entityType = resolveEntityType(entityId);
  if (!entityType) return { ok: false, error: "대상 마스터를 찾을 수 없습니다." };
  const master = findMasterRef(entityType, entityId);
  if (!master) return { ok: false, error: "대상 마스터를 찾을 수 없습니다." };
  if (master.status === "merged") {
    return { ok: false, error: "병합된 마스터는 수정할 수 없습니다." };
  }
  return null;
}

/** mutation 결과를 재검증 + ActionResult 로 변환한다. */
function finishSub(res: SubMutResult): ActionResult {
  if (!res.ok) return { ok: false, error: res.error };
  if (res.entityType && res.entityId) revalidateMaster(LIST_PATH[res.entityType], res.entityId);
  return { ok: true, value: res.value };
}

/** 대표 식별자 지정(트랜잭션). (api_contracts §10 — primary 변경) */
export async function runSetPrimary(identifierId: string, reason: string): Promise<ActionResult> {
  const blocked = guardConfigured();
  if (blocked) return blocked;
  const row = findIdentifier(identifierId);
  if (!row) return { ok: false, error: "식별자를 찾을 수 없습니다." };
  const guard = guardSubWritable(row.entityId, reason);
  if (guard) return guard;
  if (row.isPrimary) return { ok: false, error: "이미 대표 식별자입니다." };
  return finishSub(setIdentifierPrimary(identifierId, await actorName(), reason.trim()));
}

/** 식별자 검증 상태 변경. (api_contracts §10 — PATCH) */
export async function runVerifyIdentifier(
  identifierId: string,
  verifiedStatus: IdentifierVerifiedStatus,
  reason: string,
): Promise<ActionResult> {
  const blocked = guardConfigured();
  if (blocked) return blocked;
  const row = findIdentifier(identifierId);
  if (!row) return { ok: false, error: "식별자를 찾을 수 없습니다." };
  const guard = guardSubWritable(row.entityId, reason);
  if (guard) return guard;
  if (row.verifiedStatus === verifiedStatus) return { ok: false, error: "이미 해당 검증 상태입니다." };
  return finishSub(setIdentifierVerification(identifierId, verifiedStatus, await actorName(), reason.trim()));
}

/** 식별자 삭제. (api_contracts §10 — DELETE) */
export async function runRemoveIdentifier(identifierId: string, reason: string): Promise<ActionResult> {
  const blocked = guardConfigured();
  if (blocked) return blocked;
  const row = findIdentifier(identifierId);
  if (!row) return { ok: false, error: "식별자를 찾을 수 없습니다." };
  const guard = guardSubWritable(row.entityId, reason);
  if (guard) return guard;
  return finishSub(removeIdentifier(identifierId, await actorName(), reason.trim()));
}

/** 별칭 삭제. (api_contracts §11 — DELETE) */
export async function runRemoveAlias(aliasId: string, reason: string): Promise<ActionResult> {
  const blocked = guardConfigured();
  if (blocked) return blocked;
  const row = findAlias(aliasId);
  if (!row) return { ok: false, error: "별칭을 찾을 수 없습니다." };
  const guard = guardSubWritable(row.entityId, reason);
  if (guard) return guard;
  return finishSub(removeAlias(aliasId, await actorName(), reason.trim()));
}

/**
 * 민감 식별자 원본 조회(audit 기록 후 원본값 반환).
 * merged 마스터도 조회는 허용하되 사유는 고정 문구로 audit 한다(규칙5).
 */
export async function runRevealIdentifier(identifierId: string): Promise<ActionResult> {
  const blocked = guardConfigured();
  if (blocked) return blocked;
  const row = findIdentifier(identifierId);
  if (!row) return { ok: false, error: "식별자를 찾을 수 없습니다." };
  return finishSub(revealIdentifier(identifierId, await actorName(), "민감 식별자 원본 조회"));
}
