/**
 * Y&A Suite 도메인/역할/스코프 상수.
 * (근거: yna_suite_auth_permissions.md, yna_suite_rls_policy_matrix.md, 0_CLAUDE.md §4)
 *
 * 여기 값은 권한 판단(packages/permissions)·RLS·UI 메뉴 노출의 단일 기준이다.
 */

/** 배포 단위 서비스 도메인 (= Supabase 논리 스키마 이름과 동일). */
export const DOMAINS = ["hub", "dev", "work", "mna", "project", "fund", "management"] as const;

export type Domain = (typeof DOMAINS)[number];

/** 도메인별 접근 수준. none < read < write. */
export const ACCESS_LEVELS = ["none", "read", "write"] as const;
export type AccessLevel = (typeof ACCESS_LEVELS)[number];

/**
 * 데이터 스코프 타입.
 * Phase 1은 global/self/company 를 실제 사용하고,
 * department/program/fund/project 는 구조만 준비한다.
 */
export const SCOPE_TYPES = [
  "global",
  "self",
  "company",
  "department",
  "program",
  "fund",
  "project",
] as const;
export type ScopeType = (typeof SCOPE_TYPES)[number];

/** 권한 템플릿(역할). Dev 사용자 관리에서 부여한다. */
export const ROLE_TEMPLATES = [
  "master",
  "executive",
  "management_office",
  "investment_team",
  "business_team",
  "guest_expert",
  "guest_startup",
  "viewer",
] as const;
export type RoleTemplate = (typeof ROLE_TEMPLATES)[number];

/** Hub 마스터 엔티티 타입. */
export const ENTITY_TYPES = ["startup", "expert", "partner", "manager"] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];
