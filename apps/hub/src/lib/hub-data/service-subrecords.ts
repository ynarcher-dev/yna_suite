import "server-only";
import { normalizeCompanyName } from "@yna/utils";
import { ApiError } from "@/lib/api/envelope";
import { ensureFallback } from "./service";
import { normalizeIdentifierValue } from "./masters";
import {
  addAliasRow,
  addIdentifierRow,
  aliasesOf,
  findAlias,
  findIdentifier,
  findMasterRef,
  identifiersOf,
  removeAlias,
  removeIdentifier,
  resolveEntityType,
  setIdentifierPrimary,
  setIdentifierVerification,
  type MasterEntity,
} from "./mock-store";
import { toAliasApiData, toIdentifierApiData } from "./api-map";
import type { IdentifierVerifiedStatus } from "./types";

/**
 * 식별자/별칭 관리 HTTP 계약 서비스(공통 API §10~11).
 * (근거: yna_suite_api_contracts.md §10~11, master_data_policy §5~6)
 *
 * 모든 도메인 앱이 재사용하는 계약이므로 공통 envelope 오류 코드(ApiError)로 실패를 표현한다.
 * dev 폴백에선 mock 스토어, env 설정 시 ensureFallback 이 명시적으로 막는다(이슈21·25).
 */

/** 대상 마스터가 존재하고 수정 가능한지 확인한다(merged 는 conflict). */
function assertWritableMaster(entityType: MasterEntity, entityId: string): void {
  const master = findMasterRef(entityType, entityId);
  if (!master) throw new ApiError("not_found", "대상 마스터를 찾을 수 없습니다.");
  if (master.status === "merged") {
    throw new ApiError("conflict", "병합된 마스터는 수정할 수 없습니다.");
  }
}

/** 식별자 id 로 소유 엔티티를 역참조하고 수정 가능성을 확인한다. */
function ownerEntityOf(entityId: string): MasterEntity {
  const entityType = resolveEntityType(entityId);
  if (!entityType) throw new ApiError("not_found", "대상 마스터를 찾을 수 없습니다.");
  assertWritableMaster(entityType, entityId);
  return entityType;
}

export async function apiAddIdentifier(
  entityType: MasterEntity,
  entityId: string,
  input: { identifierType: string; identifierValue: string; isPrimary: boolean; reason: string },
  actorName: string,
) {
  ensureFallback();
  assertWritableMaster(entityType, entityId);
  const value = input.identifierValue.trim();
  if (!value) throw new ApiError("validation_failed", "identifier_value 는 필수입니다.");
  const normalized = normalizeIdentifierValue(input.identifierType, value);
  const dup = identifiersOf(entityId).some(
    (i) => i.identifierType === input.identifierType && i.normalizedValue === normalized,
  );
  if (dup) throw new ApiError("conflict", "이미 등록된 식별자입니다.");

  const newId = addIdentifierRow(entityType, entityId, input.identifierType, value, normalized, actorName, input.reason);
  if (!newId) throw new ApiError("internal_error", "식별자 생성에 실패했습니다.");
  if (input.isPrimary) setIdentifierPrimary(newId, actorName, input.reason);

  const row = findIdentifier(newId);
  return row ? toIdentifierApiData(row) : null;
}

export async function apiAddAlias(
  entityType: MasterEntity,
  entityId: string,
  input: { aliasType: string; aliasValue: string; reason: string },
  actorName: string,
) {
  ensureFallback();
  assertWritableMaster(entityType, entityId);
  const value = input.aliasValue.trim();
  if (!value) throw new ApiError("validation_failed", "alias_value 는 필수입니다.");
  const normalized = normalizeCompanyName(value);
  const dup = aliasesOf(entityId).some(
    (a) => a.aliasType === input.aliasType && a.normalizedValue === normalized,
  );
  if (dup) throw new ApiError("conflict", "이미 등록된 별칭입니다.");

  const newId = addAliasRow(entityType, entityId, input.aliasType, value, normalized, actorName, input.reason);
  if (!newId) throw new ApiError("internal_error", "별칭 생성에 실패했습니다.");
  const row = findAlias(newId);
  return row ? toAliasApiData(row) : null;
}

export async function apiPatchIdentifier(
  identifierId: string,
  input: { isPrimary?: boolean; verifiedStatus?: IdentifierVerifiedStatus; reason: string },
  actorName: string,
) {
  ensureFallback();
  const row = findIdentifier(identifierId);
  if (!row) throw new ApiError("not_found", "식별자를 찾을 수 없습니다.");
  ownerEntityOf(row.entityId);
  if (input.isPrimary !== true && input.verifiedStatus === undefined) {
    throw new ApiError("validation_failed", "is_primary 또는 verified_status 중 하나가 필요합니다.");
  }
  if (input.isPrimary === true) setIdentifierPrimary(identifierId, actorName, input.reason);
  if (input.verifiedStatus) setIdentifierVerification(identifierId, input.verifiedStatus, actorName, input.reason);

  const updated = findIdentifier(identifierId);
  return updated ? toIdentifierApiData(updated) : null;
}

export async function apiDeleteIdentifier(identifierId: string, reason: string, actorName: string) {
  ensureFallback();
  const row = findIdentifier(identifierId);
  if (!row) throw new ApiError("not_found", "식별자를 찾을 수 없습니다.");
  ownerEntityOf(row.entityId);
  const res = removeIdentifier(identifierId, actorName, reason);
  if (!res.ok) throw new ApiError("internal_error", res.error ?? "식별자 삭제에 실패했습니다.");
  return { id: identifierId, deleted: true };
}

export async function apiDeleteAlias(aliasId: string, reason: string, actorName: string) {
  ensureFallback();
  const row = findAlias(aliasId);
  if (!row) throw new ApiError("not_found", "별칭을 찾을 수 없습니다.");
  ownerEntityOf(row.entityId);
  const res = removeAlias(aliasId, actorName, reason);
  if (!res.ok) throw new ApiError("internal_error", res.error ?? "별칭 삭제에 실패했습니다.");
  return { id: aliasId, deleted: true };
}
