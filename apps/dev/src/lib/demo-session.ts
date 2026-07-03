import type { PermissionMap } from "@yna/core";
import type { ShellUser } from "@yna/ui";

/**
 * 데모 세션 (임시). Phase 1.4 인증/권한 배선에서 실제 Supabase 세션 +
 * JWT app_metadata.permissions 로 교체한다. AppShell 배선 검증용 자리표시자.
 */
export const DEMO_USER: ShellUser = {
  name: "관리자",
  email: "dev@ynarcher.com",
};

export const DEMO_PERMISSIONS: PermissionMap = {
  hub: { can_read: true, can_write: true, scope_type: "global" },
  dev: { can_read: true, can_write: true, scope_type: "global" },
  work: { can_read: true, can_write: false, scope_type: "global" },
  // fund/mna/project/management 은 권한 없음 → 스위처에 노출되지 않음.
};
