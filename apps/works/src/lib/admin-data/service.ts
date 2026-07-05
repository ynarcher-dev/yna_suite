import "server-only";
import { DOMAINS } from "@yna/core";
import { isSupabaseConfigured } from "@/lib/auth/env";
import { mockGetUser, mockListAudit, mockListUsers } from "./mock-store";
import type { DashboardCounts, DevUser, PermissionAuditEntry } from "./types";

/**
 * Dev 사용자·권한 데이터 조회(서버 전용).
 * (근거: yna_suite_api_contracts.md §16~18, 4_memo 이슈17·19)
 *
 * - Supabase 미설정(로컬 dev 폴백): in-memory mock 으로 화면/배선을 검증한다.
 * - Supabase 설정(운영/스테이징): auth.users + dev.user_permissions 조회로 대체한다.
 *   이 경로는 Docker/staging 에서 gen types 후 연결한다(이슈19). 지금은 명시적으로 막는다.
 */

function ensureFallback(): void {
  if (isSupabaseConfigured) {
    throw new Error(
      "Dev 사용자 조회의 Supabase 연동은 Docker/staging 환경에서 연결 예정입니다(4_memo 이슈19).",
    );
  }
}

export async function listUsers(): Promise<DevUser[]> {
  ensureFallback();
  return mockListUsers();
}

export async function getUser(id: string): Promise<DevUser | null> {
  ensureFallback();
  return mockGetUser(id);
}

export async function listAuditLogs(): Promise<PermissionAuditEntry[]> {
  ensureFallback();
  return mockListAudit();
}

/** 만료 예정(향후 30일 내) 임시 권한을 가진 사용자 여부. */
function hasExpiringPermission(user: DevUser, now: Date, windowDays = 30): boolean {
  const limit = now.getTime() + windowDays * 24 * 60 * 60 * 1000;
  return DOMAINS.some((d) => {
    const exp = user.permissions[d]?.expires_at;
    if (!exp) return false;
    const t = new Date(exp).getTime();
    return !Number.isNaN(t) && t > now.getTime() && t <= limit;
  });
}

export async function getDashboardCounts(now: Date = new Date()): Promise<DashboardCounts> {
  ensureFallback();
  const users = mockListUsers();
  return {
    totalUsers: users.length,
    activeUsers: users.filter((u) => u.status === "active").length,
    expiringPermissions: users.filter((u) => hasExpiringPermission(u, now)).length,
    externalUsers: users.filter((u) => u.isExternal).length,
  };
}
