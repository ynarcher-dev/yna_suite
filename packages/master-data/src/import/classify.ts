import {
  scoreDuplicateCandidate,
  shouldProposeCandidate,
  type CandidateScore,
  type ComparableMaster,
} from "../merge/candidate";

/**
 * import row 판정(순수). (근거: yna_suite_migration_strategy.md §9·11)
 *
 * 이관 대상 row 를 기존 Hub 마스터와 비교해 다음 중 하나로 분류한다.
 *   - connect     : 강한 식별자 일치 → 기존 마스터에 연결
 *   - candidate   : 공식 번호 없이 여러 단서 일치 → 임시 마스터 + 중복 후보(운영자 검토)
 *   - new_master  : 일치 후보 없음(또는 공식 번호 충돌) → 신규 임시 마스터
 * 필수값 누락(failed)은 호출부에서 판정 전에 걸러낸다.
 * 비교 점수/충돌 판단은 scoreDuplicateCandidate 를 재사용해 임시 생성 경로와 vocabulary 를 맞춘다.
 */

export type ImportClassKind = "connect" | "candidate" | "new_master";

export interface ImportClassification {
  kind: ImportClassKind;
  /** connect/candidate 의 비교 대상 마스터 id(new_master 는 null). */
  targetId: string | null;
  score: number;
  reasons: string[];
  /** 공식 번호 충돌 등으로 연결/병합이 금지된 매칭인지. */
  conflict: boolean;
}

/** 강한 식별자 일치로 기존 마스터에 연결하는 최소 점수(사업자번호 일치 등). */
const STRONG_CONNECT_MIN = 95;

/**
 * 이관 row(subject)를 기존 마스터 후보들과 비교해 판정한다.
 * @param subject 이관 row 의 정규화 비교 필드
 * @param existing 기존 활성 마스터의 {id, 비교필드} 목록
 */
export function classifyAgainst(
  subject: ComparableMaster,
  existing: { id: string; comparable: ComparableMaster }[],
): ImportClassification {
  let connect: { id: string; result: CandidateScore } | null = null;
  let candidate: { id: string; result: CandidateScore } | null = null;
  let conflicted: CandidateScore | null = null;

  for (const e of existing) {
    const result = scoreDuplicateCandidate(subject, e.comparable);
    if (result.conflict) {
      conflicted = result;
      continue; // 공식 번호 충돌 → 연결/후보 대상에서 제외(자동 병합 금지).
    }
    if (result.score >= STRONG_CONNECT_MIN && (!connect || result.score > connect.result.score)) {
      connect = { id: e.id, result };
    }
    if (shouldProposeCandidate(result) && (!candidate || result.score > candidate.result.score)) {
      candidate = { id: e.id, result };
    }
  }

  // 강한 식별자 일치 → 기존 연결(최우선).
  if (connect) {
    return { kind: "connect", targetId: connect.id, score: connect.result.score, reasons: connect.result.reasons, conflict: false };
  }
  // 공식 번호 없이 단서 일치 → 임시 마스터 + 중복 후보.
  if (candidate) {
    return { kind: "candidate", targetId: candidate.id, score: candidate.result.score, reasons: candidate.result.reasons, conflict: false };
  }
  // 공식 번호 충돌만 있었다면 별도 신규 마스터(충돌 사유 보존).
  if (conflicted) {
    return { kind: "new_master", targetId: null, score: 0, reasons: conflicted.reasons, conflict: true };
  }
  // 일치 후보 없음 → 신규 임시 마스터.
  return { kind: "new_master", targetId: null, score: 0, reasons: [], conflict: false };
}
