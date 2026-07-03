/**
 * 중복 후보 점수 등급.
 * (근거: yna_suite_master_data_policy.md §10·13~15, 3_checklist.md Phase 1.10)
 *
 *   95 이상  : 강한 식별자 일치
 *   80 ~ 94  : 중간
 *   60 ~ 79  : 약함
 *   60 미만  : 후보 유지 안 함
 *
 * 공식 번호(사업자번호 등)가 없거나 충돌하면 자동 병합은 금지한다(수동 승인만).
 */
export const CANDIDATE_STRENGTH_THRESHOLDS = {
  strong: 95,
  medium: 80,
  weak: 60,
} as const;

export type CandidateStrength = "strong" | "medium" | "weak" | "none";

export function candidateStrength(score: number): CandidateStrength {
  if (score >= CANDIDATE_STRENGTH_THRESHOLDS.strong) return "strong";
  if (score >= CANDIDATE_STRENGTH_THRESHOLDS.medium) return "medium";
  if (score >= CANDIDATE_STRENGTH_THRESHOLDS.weak) return "weak";
  return "none";
}

/** 후보로 유지할지(약함 이상) 여부. */
export function isCandidate(score: number): boolean {
  return candidateStrength(score) !== "none";
}
