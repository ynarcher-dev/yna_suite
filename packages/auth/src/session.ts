import type { User } from "@supabase/supabase-js";
import type { PermissionMap } from "@yna/core";

/**
 * Supabase Auth 세션에서 권한 claim 을 읽는다.
 * (근거: yna_suite_auth_permissions.md, 0_CLAUDE.md §4 — app_metadata.permissions No-Join)
 *
 * 권한은 로그인 시 app_metadata.permissions 에 실려 발급된다.
 * 여기서는 신뢰 경계 안의 값을 형태만 맞춰 꺼낸다(최종 강제는 RLS).
 */
export function permissionsFromUser(user: User | null | undefined): PermissionMap {
  if (!user) return {};
  const raw = (user.app_metadata as Record<string, unknown> | undefined)?.["permissions"];
  if (!raw || typeof raw !== "object") return {};
  return raw as PermissionMap;
}

export interface SessionUser {
  id: string;
  email: string | null;
  permissions: PermissionMap;
}

export function toSessionUser(user: User | null | undefined): SessionUser | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? null,
    permissions: permissionsFromUser(user),
  };
}
