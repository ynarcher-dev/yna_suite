import "server-only";
import { canRead, canWrite } from "@yna/permissions";
import { getSession, type AppSession } from "@/lib/auth/session";
import { APP_DOMAIN } from "@/lib/auth/env";
import { ApiError } from "./envelope";

/**
 * API 라우트 인증·권한 가드. (근거: api_contracts §3, auth_permissions §8)
 * UI 권한은 UX 일 뿐이며 서버 API 도 세션·권한을 직접 확인한다(최종 강제는 RLS).
 */
export async function requireHubAccess(mode: "read" | "write"): Promise<AppSession> {
  const session = await getSession();
  if (!session) {
    throw new ApiError("unauthenticated", "로그인이 필요합니다.");
  }
  const perms = session.user.permissions;
  const allowed = mode === "write" ? canWrite(perms, APP_DOMAIN) : canRead(perms, APP_DOMAIN);
  if (!allowed) {
    throw new ApiError("permission_denied", "이 작업을 수행할 권한이 없습니다.");
  }
  return session;
}
