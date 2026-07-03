import type { Domain, PermissionMap, ScopeType } from "@yna/core";
import { canRead, isExpired } from "./check";

/**
 * 데이터 scope 판단 helper.
 * (근거: yna_suite_auth_permissions.md §5, yna_suite_rls_policy_matrix.md §4)
 *
 * scope 는 도메인 권한이 있을 때 "어느 범위의 데이터를 볼 수 있는가"를 결정한다.
 * Phase 1 은 global/self/company 를 실제 사용하고 나머지는 구조만 준비한다.
 * 여기 로직은 RLS helper(dev.get_scope_type/get_scope_id)와 동일한 규칙을 따라야 한다.
 * (읽기 권한이 없거나 만료된 임시 권한이면 scope 도 무효)
 */

/** 도메인의 유효 scope_type. 접근 불가/만료면 null. */
export function scopeTypeOf(
  permissions: PermissionMap,
  domain: Domain,
  now: Date = new Date(),
): ScopeType | null {
  const perm = permissions[domain];
  if (!perm || isExpired(perm, now) || !canRead(permissions, domain, now)) return null;
  return perm.scope_type;
}

/** 도메인 scope 의 대상 식별자(company_id 등). global/self 이거나 미지정이면 null. */
export function scopeIdOf(
  permissions: PermissionMap,
  domain: Domain,
  now: Date = new Date(),
): string | null {
  const perm = permissions[domain];
  if (!perm || isExpired(perm, now) || !canRead(permissions, domain, now)) return null;
  return perm.scope_id ?? null;
}

/** 전사 범위(global) 접근 여부. 목록 전체 조회 가능 여부 판단 등에 사용. */
export function hasGlobalScope(
  permissions: PermissionMap,
  domain: Domain,
  now: Date = new Date(),
): boolean {
  return scopeTypeOf(permissions, domain, now) === "global";
}
