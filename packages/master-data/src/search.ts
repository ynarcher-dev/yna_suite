import type { EntityType } from "@yna/core";

/**
 * 마스터 검색 공통 계약.
 * (근거: yna_suite_api_contracts.md §6, yna_suite_master_data_policy.md §7~9)
 *
 * 모든 도메인 앱이 재사용하는 계약이다. 실제 쿼리 구현은 Phase 1.8 에서
 * packages/database query helper 위에 올린다.
 */
export interface MasterSearchParams {
  entityType: EntityType;
  q: string;
  limit?: number;
  includeMerged?: boolean;
}

export interface MasterSearchHit {
  id: string;
  masterCode: string;
  displayName: string;
  /** 매칭에 기여한 필드(name/legal_name/alias/identifier 등). */
  matchedFields: string[];
  /** 0~100 매칭 점수. */
  score: number;
}
