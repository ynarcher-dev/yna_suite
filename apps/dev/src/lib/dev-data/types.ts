import type { Domain, PermissionMap, RoleTemplate } from "@yna/core";

/**
 * Dev 사용자·권한 관리 화면의 도메인 타입.
 * (근거: yna_suite_hub_dev_functional_spec.md §15~19, yna_suite_data_model.md §5)
 *
 * name/email/status/last_sign_in 은 auth.users 에서, role_key/권한은 dev.user_permissions
 * 에서 온다. 실제 조회는 Docker/staging 에서 연결하고(이슈19), 현재는 mock 으로 배선을 검증한다.
 */

export type UserStatus = "active" | "invited" | "disabled";

export interface DevUser {
  id: string;
  name: string;
  email: string;
  /** 대표 역할(권한 부여 시 적용한 템플릿). dev.user_permissions.role_key 기준. */
  roleKey: RoleTemplate;
  status: UserStatus;
  lastSignInAt: string | null;
  createdAt: string;
  /** guest_startup/guest_expert 등 외부 사용자 여부. */
  isExternal: boolean;
  /** 외부 사용자가 연결된 마스터(startup_id/expert_id). */
  linkedMasterId: string | null;
  /** 도메인별 권한(JWT app_metadata.permissions 와 동일 형태). */
  permissions: PermissionMap;
}

/** 권한 변경 감사 로그 항목. (dev.permission_audit_logs) */
export interface PermissionAuditEntry {
  id: string;
  actorName: string;
  targetName: string;
  /** grant/update/apply_template/invite/link_external/set_status 등. */
  action: string;
  domain: Domain | null;
  before: unknown;
  after: unknown;
  reason: string | null;
  createdAt: string;
}

/** 권한 템플릿 정보. (dev.permission_templates) */
export interface TemplateInfo {
  roleKey: RoleTemplate;
  displayName: string;
  description: string;
  permissions: PermissionMap;
}

/** Dev 대시보드 위젯 집계. */
export interface DashboardCounts {
  totalUsers: number;
  activeUsers: number;
  expiringPermissions: number;
  externalUsers: number;
}

/** 서버 액션 공통 결과. */
export interface ActionResult {
  ok: boolean;
  error?: string;
  /** master 수준 변경이라 확인 dialog 가 필요함을 알림. */
  needsMasterConfirm?: boolean;
}
