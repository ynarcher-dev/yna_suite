import {
  type Domain,
  DOMAINS,
  type DomainPermission,
  type PermissionMap,
  type RoleTemplate,
  type ScopeType,
  SCOPE_TYPES,
} from "@yna/core";
import { ROLE_DEFAULT_SCOPE, templatePermissions } from "./templates";

/**
 * Dev 사용자·권한 관리(Phase 1.5)의 순수 권한 변경 로직.
 * (근거: yna_suite_hub_admin_functional_spec.md §16~19, yna_suite_api_contracts.md §17~18,
 *        yna_suite_auth_permissions.md §6·§9, 0_CLAUDE.md §4)
 *
 * 여기 함수는 DB/네트워크에 의존하지 않는 순수 함수로, RLS helper(dev.*) 및
 * check.ts/scope.ts 의 규칙과 동일한 불변식을 강제한다:
 *   - can_write=true 이면 can_read=true 를 강제한다.
 *   - expires_at 이 과거이면 권한 부여를 거부한다.
 *   - company scope 는 대상 식별자(scope_id)가 반드시 있어야 한다.
 * 최종 보안은 RLS 가 강제하며 이 로직은 UI/서버 액션의 사전 검증·감사 준비용이다.
 */

/** 권한 편집 폼에서 들어오는 원시 입력(도메인 1개 기준). */
export interface PermissionInput {
  can_read: boolean;
  can_write: boolean;
  scope_type: ScopeType;
  scope_id?: string | null;
  expires_at?: string | null;
}

/** 검증 실패 사유. */
export interface PermissionValidationError {
  code: "expires_in_past" | "scope_id_required" | "invalid_scope_type" | "invalid_expires_at";
  message: string;
}

/** scope_type 이 특정 대상(scope_id)을 요구하는지 여부. global/self 는 대상 불필요. */
export function scopeRequiresTarget(scopeType: ScopeType): boolean {
  return scopeType !== "global" && scopeType !== "self";
}

/**
 * 권한 입력을 정규화한다.
 *   - can_write=true → can_read=true 강제
 *   - global/self scope 는 scope_id 를 null 로 정리
 *   - 빈 문자열 scope_id/expires_at 은 null 로
 */
export function normalizePermission(input: PermissionInput): DomainPermission {
  const canWrite = input.can_write;
  const canRead = input.can_read || canWrite; // write 는 read 를 포함
  const scopeId = scopeRequiresTarget(input.scope_type)
    ? (input.scope_id?.trim() || null)
    : null;
  const expiresAt = input.expires_at?.trim() || null;
  return {
    can_read: canRead,
    can_write: canWrite,
    scope_type: input.scope_type,
    scope_id: scopeId,
    expires_at: expiresAt,
  };
}

/**
 * 권한 입력을 검증한다. 통과하면 null, 실패하면 오류를 반환한다.
 * (근거: api_contracts §17 — expires_at 과거 거부, can_write→can_read 강제,
 *        company scope 대상 필요)
 */
export function validatePermissionInput(
  input: PermissionInput,
  now: Date = new Date(),
): PermissionValidationError | null {
  if (!SCOPE_TYPES.includes(input.scope_type)) {
    return { code: "invalid_scope_type", message: "알 수 없는 scope 유형입니다." };
  }
  if (input.expires_at) {
    const expires = new Date(input.expires_at);
    if (Number.isNaN(expires.getTime())) {
      return { code: "invalid_expires_at", message: "만료일 형식이 올바르지 않습니다." };
    }
    if (expires.getTime() <= now.getTime()) {
      return { code: "expires_in_past", message: "만료일은 현재 시각 이후여야 합니다." };
    }
  }
  if (scopeRequiresTarget(input.scope_type) && !input.scope_id?.trim()) {
    return { code: "scope_id_required", message: "이 scope 유형에는 대상 식별자가 필요합니다." };
  }
  return null;
}

/** 두 도메인 권한이 실질적으로 같은지 비교(감사 diff 판단용). */
export function permissionEquals(
  a: DomainPermission | null | undefined,
  b: DomainPermission | null | undefined,
): boolean {
  if (!a || !b) return !a && !b;
  return (
    a.can_read === b.can_read &&
    a.can_write === b.can_write &&
    a.scope_type === b.scope_type &&
    (a.scope_id ?? null) === (b.scope_id ?? null) &&
    (a.expires_at ?? null) === (b.expires_at ?? null)
  );
}

/** 감사 로그용 도메인 단위 변경 항목. */
export interface PermissionChange {
  domain: Domain;
  before: DomainPermission | null;
  after: DomainPermission | null;
}

/**
 * 두 PermissionMap 의 도메인별 변경분을 계산한다(권한 감사 before/after 기록용).
 * 변경 없는 도메인은 제외한다.
 */
export function diffPermissions(before: PermissionMap, after: PermissionMap): PermissionChange[] {
  const changes: PermissionChange[] = [];
  for (const domain of DOMAINS) {
    const b = before[domain] ?? null;
    const a = after[domain] ?? null;
    if (!permissionEquals(a, b)) changes.push({ domain, before: b, after: a });
  }
  return changes;
}

/**
 * master 수준 변경 여부. Dev 도메인 write 권한이 부여/회수되면 추가 확인(dialog)이 필요하다.
 * (근거: functional_spec §16 — master 권한 변경은 확인 dialog)
 */
export function isMasterLevelChange(before: PermissionMap, after: PermissionMap): boolean {
  const beforeDevWrite = before.admin?.can_write ?? false;
  const afterDevWrite = after.admin?.can_write ?? false;
  return beforeDevWrite !== afterDevWrite;
}

/** 역할 템플릿이 master 계열(전 도메인 write)인지. 템플릿 적용 시 확인 dialog 판단. */
export function isMasterRole(role: RoleTemplate): boolean {
  return role === "master";
}

/**
 * 역할 템플릿에 도메인별 override 를 덮어써 최종 PermissionMap 을 만든다.
 * override 값이 null 이면 해당 도메인 접근을 제거한다(none).
 */
export function applyOverrides(
  base: PermissionMap,
  overrides: Partial<Record<Domain, PermissionInput | null>>,
): PermissionMap {
  const result: PermissionMap = { ...base };
  for (const domain of DOMAINS) {
    if (!(domain in overrides)) continue;
    const override = overrides[domain];
    if (override === null || override === undefined) {
      delete result[domain];
    } else {
      result[domain] = normalizePermission(override);
    }
  }
  return result;
}

/** 역할 템플릿을 그대로 전개한 PermissionMap(override 없음). */
export function permissionsFromRole(role: RoleTemplate): PermissionMap {
  return templatePermissions(role);
}

/** 외부 사용자 연결 종류. (근거: functional_spec §19) */
export type ExternalUserKind = "guest_startup" | "guest_expert";

export interface ExternalLinkGrant {
  role: RoleTemplate;
  permissions: PermissionMap;
}

/**
 * 외부 사용자(게스트) 연결 시 부여할 역할·권한을 만든다.
 * (근거: functional_spec §19)
 *   - guest_startup: work 를 company scope 로, scope_id=startup_id
 *   - guest_expert:  work 를 self scope 로, scope_id=expert_id(배정 기준 접근)
 * 외부 사용자는 hub/dev 접근이 없어야 하며 템플릿이 이를 보장한다.
 */
export function externalLinkGrant(kind: ExternalUserKind, masterId: string): ExternalLinkGrant {
  const role: RoleTemplate = kind;
  const base = templatePermissions(role);
  const scopeType: ScopeType = kind === "guest_startup" ? "company" : "self";
  const ac = base.ac;
  if (ac) {
    base.ac = { ...ac, scope_type: scopeType, scope_id: masterId };
  }
  // 방어적: 외부 사용자는 hub/dev 접근을 갖지 않는다.
  delete base.hub;
  delete base.admin;
  return { role, permissions: base };
}

/** 외부 연결 종류의 기본 scope_type(표시/검증용). */
export function externalLinkScopeType(kind: ExternalUserKind): ScopeType {
  return kind === "guest_startup" ? "company" : ROLE_DEFAULT_SCOPE.guest_expert;
}
