import type { Domain, ScopeType } from "./domains";

/**
 * JWT app_metadata.permissions 에 실리는 도메인별 권한 claim.
 * (근거: 0_CLAUDE.md §4 — can_read/can_write/scope_type/scope_id/expires_at 동봉)
 *
 * RLS helper 는 이 claim 을 No-Join 으로 파싱한다.
 * - can_write=true 이면 can_read=true 를 강제한다.
 * - expires_at <= now() 인 임시 권한은 즉시 차단한다(access token 유효 여부와 별개).
 */
export interface DomainPermission {
  can_read: boolean;
  can_write: boolean;
  scope_type: ScopeType;
  /** scope_type 이 global/self 가 아닐 때의 대상 식별자(company_id 등). */
  scope_id?: string | null;
  /** ISO 8601. 임시 권한 만료 시각. 없으면 만료 없음. */
  expires_at?: string | null;
}

/** JWT app_metadata.permissions 전체 형태: 도메인 → 권한. */
export type PermissionMap = Partial<Record<Domain, DomainPermission>>;
