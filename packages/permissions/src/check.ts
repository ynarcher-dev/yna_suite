import type { Domain, DomainPermission, PermissionMap } from "@yna/core";

/**
 * 권한 판단 helper.
 * (근거: yna_suite_auth_permissions.md, 0_CLAUDE.md §4)
 *
 * UI/서버 코드는 이 helper 로 권한을 판단한다. 단, 최종 보안 강제는 RLS 이며
 * 여기 로직은 RLS helper(dev.can_read_domain 등)와 동일한 규칙을 따라야 한다.
 *   - can_write=true 이면 can_read=true 를 강제한다.
 *   - expires_at <= now() 인 임시 권한은 즉시 차단한다.
 */

/** 임시 권한 만료 여부. now 를 주입받아 테스트 가능하게 한다. */
export function isExpired(perm: DomainPermission, now: Date = new Date()): boolean {
  if (!perm.expires_at) return false;
  const expiresAt = new Date(perm.expires_at);
  if (Number.isNaN(expiresAt.getTime())) return true; // 파싱 불가 → 안전하게 차단
  return expiresAt.getTime() <= now.getTime();
}

/** 도메인 읽기 권한. 만료 임시 권한은 false. */
export function canRead(
  permissions: PermissionMap,
  domain: Domain,
  now: Date = new Date(),
): boolean {
  const perm = permissions[domain];
  if (!perm || isExpired(perm, now)) return false;
  // can_write=true 이면 can_read=true 강제.
  return perm.can_read || perm.can_write;
}

/** 도메인 쓰기 권한. 만료 임시 권한은 false. */
export function canWrite(
  permissions: PermissionMap,
  domain: Domain,
  now: Date = new Date(),
): boolean {
  const perm = permissions[domain];
  if (!perm || isExpired(perm, now)) return false;
  return perm.can_write;
}

/** 접근 가능한(읽기 이상) 도메인 목록. 메뉴 노출 판단 등에 사용. */
export function accessibleDomains(
  permissions: PermissionMap,
  domains: readonly Domain[],
  now: Date = new Date(),
): Domain[] {
  return domains.filter((d) => canRead(permissions, d, now));
}
