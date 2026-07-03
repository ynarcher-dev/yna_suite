import "server-only";
import { canRead, canWrite } from "@yna/permissions";
import { getSession, type AppSession } from "@/lib/auth/session";
import { publicEnv } from "@/lib/auth/env";
import { ApiError } from "@/lib/api/envelope";

/**
 * Mock Work API 가드(Phase 1.13). (근거: yna_suite_api_contracts.md §19)
 *
 * - production 에서는 비활성화한다("staging/dev 에서만 사용").
 * - Mock API 도 Dev 권한과 RLS 를 우회하지 않는다 — work 도메인 read/write 를 직접 확인한다.
 *   (최종 강제는 RLS. 로컬 dev 폴백 세션은 master 권한이라 work 접근이 허용된다.)
 */

const WORK_DOMAIN = "work" as const;

/** production 이면 mock 을 비활성화한다(호출 즉시 not_found). */
export function assertMockEnabled(): void {
  if (publicEnv?.NEXT_PUBLIC_APP_ENV === "production") {
    throw new ApiError("not_found", "Mock Work API 는 production 에서 비활성화됩니다.");
  }
}

export async function requireWorkMockAccess(mode: "read" | "write"): Promise<AppSession> {
  assertMockEnabled();
  const session = await getSession();
  if (!session) throw new ApiError("unauthenticated", "로그인이 필요합니다.");
  const perms = session.user.permissions;
  const allowed = mode === "write" ? canWrite(perms, WORK_DOMAIN) : canRead(perms, WORK_DOMAIN);
  if (!allowed) throw new ApiError("permission_denied", "work 도메인 권한이 없습니다.");
  return session;
}
