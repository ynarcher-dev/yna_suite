/**
 * 병합된 마스터의 최종 id resolve 표준 helper.
 * (근거: yna_suite_master_data_policy.md §10.3, yna_suite_api_contracts.md §14)
 *
 * 병합은 2단계로 반영된다 — 승인 시점엔 source.status='merged' + merged_into_id 만 동기 커밋하고,
 * 타 도메인 FK 일괄 업데이트는 백그라운드에서 비동기 처리한다. 비동기 반영 중에도 조회가
 * 최종 마스터를 가리키도록, 업무 도메인 쿼리는 hub 마스터를 직접 조인하며 COALESCE 를 반복 작성하지 않고
 * 이 helper 또는 hub.resolved_* view 를 경유한다.
 */

/** merged_into_id 를 따라 최종 마스터 id 를 구한다(COALESCE(merged_into_id, id) 의 TS 판). */
export function resolveMasterId(row: { id: string; mergedIntoId?: string | null }): string {
  return row.mergedIntoId ?? row.id;
}

/** 이미 병합되어 다른 마스터로 귀속되었는지 여부. */
export function isMerged(row: { status?: string | null; mergedIntoId?: string | null }): boolean {
  return row.status === "merged" || Boolean(row.mergedIntoId);
}

/** 엔티티별 resolved view 이름(업무 도메인 조회의 표준 진입점). */
export const RESOLVED_MASTER_VIEW: Record<"startup" | "expert" | "partner", string> = {
  startup: "hub.resolved_startups",
  expert: "hub.resolved_experts",
  partner: "hub.resolved_partners",
};
