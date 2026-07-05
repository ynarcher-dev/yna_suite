import "server-only";
import { toSessionUser, type SessionUser } from "@yna/auth";
import type { ShellUser } from "@yna/ui";
import { isSupabaseConfigured } from "./env";
import { getServerClient } from "./server";
import { DEV_FALLBACK_PERMISSIONS, DEV_FALLBACK_USER } from "./dev-session";

/** 화면 배선용 세션 상태(폴백 여부 포함). */
export interface AppSession {
  user: SessionUser;
  shellUser: ShellUser;
  /** Supabase 미설정으로 dev 폴백 세션을 쓰는지 여부. */
  isFallback: boolean;
}

/**
 * 현재 로그인 세션을 읽는다.
 * - Supabase 설정됨: JWT app_metadata 에서 권한을 파싱(No-Join). 미로그인이면 null.
 * - Supabase 미설정(로컬): dev 폴백 세션(master 권한)으로 배선 검증.
 * (근거: yna_suite_auth_permissions.md §3, 4_memo 이슈15)
 */
export async function getSession(): Promise<AppSession | null> {
  if (!isSupabaseConfigured) {
    return {
      user: {
        id: "dev-fallback",
        email: DEV_FALLBACK_USER.email,
        permissions: DEV_FALLBACK_PERMISSIONS,
      },
      shellUser: DEV_FALLBACK_USER,
      isFallback: true,
    };
  }

  const supabase = await getServerClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const sessionUser = toSessionUser(user);
  if (!sessionUser) return null;

  return {
    user: sessionUser,
    shellUser: {
      name: sessionUser.email ?? "사용자",
      email: sessionUser.email ?? "",
    },
    isFallback: false,
  };
}
