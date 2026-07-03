import type { PermissionMap } from "@yna/core";
import type { ShellUser } from "@yna/ui";
import { templatePermissions } from "@yna/permissions";

/**
 * dev 폴백 세션 (Supabase env 미설정 로컬 전용).
 * (근거: 4_memo 이슈15 — Docker 미설치로 실제 로그인 불가 → UI/배선 검증용)
 *
 * Supabase 가 설정되면(env 존재) 이 값은 사용되지 않고 실제 JWT 권한으로 대체된다.
 * 운영/스테이징에는 절대 노출되지 않는다(env 가 항상 설정되므로).
 */
export const DEV_FALLBACK_USER: ShellUser = {
  name: "관리자(개발)",
  email: "dev@ynarcher.com",
};

/** master 템플릿 권한 = 전 도메인 접근(폴백에서 AppShell 전체 배선 확인용). */
export const DEV_FALLBACK_PERMISSIONS: PermissionMap = templatePermissions("master");
