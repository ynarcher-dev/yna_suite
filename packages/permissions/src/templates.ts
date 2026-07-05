import {
  DOMAINS,
  type Domain,
  type DomainPermission,
  type PermissionMap,
  type RoleTemplate,
  type ScopeType,
} from "@yna/core";

/**
 * 권한 템플릿(역할별 기본 도메인 권한 + 기본 scope).
 * (근거: yna_suite_auth_permissions.md §6, yna_suite_rls_policy_matrix.md §3)
 *
 * 이 매트릭스는 Dev 사용자 관리에서 역할을 부여할 때의 기본값이며,
 * admin.permission_templates seed(마이그레이션)와 동일한 값이어야 한다.
 * 실제 권한은 사용자별 override 가 가능하다(Phase 1.5).
 */

/** 템플릿의 도메인 접근 수준. */
export type TemplateAccess = "none" | "read" | "write";

/** 역할 × 도메인 기본 접근 수준. (auth_permissions.md §6 표) */
export const ROLE_TEMPLATE_MATRIX: Record<RoleTemplate, Record<Domain, TemplateAccess>> = {
  master: {
    hub: "write",
    admin: "write",
    ac: "write",
    mna: "write",
    project: "write",
    fund: "write",
    management: "write",
  },
  executive: {
    hub: "read",
    admin: "none",
    ac: "read",
    mna: "read",
    project: "read",
    fund: "read",
    management: "read",
  },
  management_office: {
    hub: "read",
    admin: "none",
    ac: "read",
    mna: "none",
    project: "write",
    fund: "read",
    management: "write",
  },
  investment_team: {
    hub: "read",
    admin: "none",
    ac: "read",
    mna: "write",
    project: "write",
    fund: "write",
    management: "read",
  },
  business_team: {
    hub: "read",
    admin: "none",
    ac: "write",
    mna: "none",
    project: "write",
    fund: "none",
    management: "read",
  },
  guest_expert: {
    hub: "none",
    admin: "none",
    ac: "read",
    mna: "none",
    project: "none",
    fund: "none",
    management: "none",
  },
  guest_startup: {
    hub: "none",
    admin: "none",
    ac: "write",
    mna: "none",
    project: "none",
    fund: "none",
    management: "none",
  },
  viewer: {
    hub: "read",
    admin: "none",
    ac: "read",
    mna: "none",
    project: "none",
    fund: "none",
    management: "none",
  },
};

/**
 * 역할별 기본 scope_type.
 * 외부 사용자만 self/company 로 좁히고, 내부 역할은 Phase 1 에서 global 로 둔다.
 * (department/program/fund/project 는 구조만 준비 — Phase 1 미사용)
 */
export const ROLE_DEFAULT_SCOPE: Record<RoleTemplate, ScopeType> = {
  master: "global",
  executive: "global",
  management_office: "global",
  investment_team: "global",
  business_team: "global",
  guest_expert: "self",
  guest_startup: "company",
  viewer: "global",
};

/**
 * 역할 템플릿을 PermissionMap 으로 전개한다(접근 불가 도메인은 제외).
 * can_write=true 이면 can_read=true 를 강제한다.
 * scope_id/expires_at 는 사용자별로 지정하므로 여기서는 비운다.
 */
export function templatePermissions(role: RoleTemplate): PermissionMap {
  const matrix = ROLE_TEMPLATE_MATRIX[role];
  const scopeType = ROLE_DEFAULT_SCOPE[role];
  const map: PermissionMap = {};
  for (const domain of DOMAINS) {
    const access = matrix[domain];
    if (access === "none") continue;
    const canWrite = access === "write";
    const perm: DomainPermission = {
      can_read: true, // read/write 둘 다 read 를 포함
      can_write: canWrite,
      scope_type: scopeType,
      scope_id: null,
      expires_at: null,
    };
    map[domain] = perm;
  }
  return map;
}
