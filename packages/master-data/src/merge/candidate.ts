import { candidateStrength, isCandidate } from "./score";

/**
 * 규칙 기반 중복 후보 점수 계산(순수 함수).
 * (근거: yna_suite_master_data_policy.md §13~14, yna_suite_api_contracts.md §7)
 *
 * 두 마스터의 정규화된 비교 필드를 받아 점수(0~100) · 매칭 사유 · 충돌 여부를 낸다.
 * 정책 원칙:
 *   - 공식 번호(사업자/법인)가 서로 다르면 충돌 → 후보로 제안하지 않는다(자동 병합 금지).
 *   - 공식 번호가 일치하면 강한 식별자(95↑).
 *   - 공식 번호가 없으면 이름/대표자/연락처 등 중간·약한 단서만으로는 94 를 넘기지 않는다.
 *   - 이름만 유사하면 약한 후보(60~79)로만 둔다.
 * 실제 병합 승인은 항상 관리자 수동 처리(Phase 1.10). 이 함수는 후보 생성에만 쓴다.
 */

/** 엔티티 공통 비교 필드. 모두 정규화된 값(없으면 null). */
export interface ComparableMaster {
  /** normalizeCompanyName 결과. */
  normalizedName: string;
  /** 정규화된 대표자명(공백 제거·소문자). */
  representativeName?: string | null;
  /** 정규화된 사업자번호(숫자만). */
  businessNumber?: string | null;
  /** 정규화된 법인등록번호. */
  corporationNumber?: string | null;
  /** 정규화된 전화(숫자만). */
  phone?: string | null;
  /** 정규화된 이메일. */
  email?: string | null;
  /** 정규화된 website 도메인. */
  websiteDomain?: string | null;
}

export interface CandidateScore {
  score: number;
  reasons: string[];
  /** 공식 번호 충돌 등으로 후보 생성을 막아야 하는지. */
  conflict: boolean;
}

/** 강한 식별자 일치 기준 점수(사업자번호 등). */
const STRONG_BASE = 96;

/** 중간·약한 단서 가중치. 공식 번호 없이 합산은 94 를 넘지 않는다. */
const WEIGHTS = {
  nameExact: 45,
  nameSimilar: 25,
  representative: 25,
  phone: 30,
  email: 30,
  website: 20,
} as const;

function bothPresent(a?: string | null, b?: string | null): boolean {
  return Boolean(a && b);
}

function eq(a?: string | null, b?: string | null): boolean {
  return Boolean(a && b && a === b);
}

/** 이름이 유사한지(정확 일치 제외, 한쪽이 다른 쪽을 포함, 길이 2 이상). */
function namesSimilar(a: string, b: string): boolean {
  if (!a || !b || a === b) return false;
  if (a.length < 2 || b.length < 2) return false;
  return a.includes(b) || b.includes(a);
}

/**
 * 두 마스터의 중복 후보 점수를 계산한다.
 * @returns score 0~100, 매칭 사유 키(seed·화면 라벨과 동일 vocabulary), conflict 여부
 */
export function scoreDuplicateCandidate(a: ComparableMaster, b: ComparableMaster): CandidateScore {
  // 1) 공식 번호 충돌 → 후보 제안 금지.
  if (bothPresent(a.businessNumber, b.businessNumber) && a.businessNumber !== b.businessNumber) {
    return { score: 0, reasons: ["business_number_conflict"], conflict: true };
  }
  if (
    bothPresent(a.corporationNumber, b.corporationNumber) &&
    a.corporationNumber !== b.corporationNumber
  ) {
    return { score: 0, reasons: ["corporation_number_conflict"], conflict: true };
  }

  const reasons: string[] = [];

  // 2) 강한 식별자 일치.
  let strong = false;
  if (eq(a.businessNumber, b.businessNumber)) {
    reasons.push("business_number_match");
    strong = true;
  }
  if (eq(a.corporationNumber, b.corporationNumber)) {
    reasons.push("corporation_number_match");
    strong = true;
  }

  // 3) 중간·약한 단서.
  let pts = 0;
  const nameExact = Boolean(a.normalizedName && a.normalizedName === b.normalizedName);
  if (nameExact) {
    reasons.push("normalized_name_exact");
    pts += WEIGHTS.nameExact;
  } else if (namesSimilar(a.normalizedName, b.normalizedName)) {
    reasons.push("normalized_name_similar");
    pts += WEIGHTS.nameSimilar;
  }
  if (eq(a.representativeName, b.representativeName)) {
    reasons.push("representative_name_match");
    pts += WEIGHTS.representative;
  }
  if (eq(a.phone, b.phone)) {
    reasons.push("founder_phone_match");
    pts += WEIGHTS.phone;
  }
  if (eq(a.email, b.email)) {
    reasons.push("founder_email_match");
    pts += WEIGHTS.email;
  }
  if (eq(a.websiteDomain, b.websiteDomain)) {
    reasons.push("website_domain_match");
    pts += WEIGHTS.website;
  }

  if (strong) {
    // 강한 식별자 기반: 96 + 추가 단서 보정(최대 99).
    const boost = Math.min(3, reasons.length - 1);
    return { score: Math.min(99, STRONG_BASE + boost), reasons, conflict: false };
  }

  // 공식 번호 없음: 중간/약한 단서 합산(94 상한).
  return { score: Math.min(94, pts), reasons, conflict: false };
}

/** 후보로 유지할 점수(약함 이상)인지, 충돌이 아닌지. */
export function shouldProposeCandidate(result: CandidateScore): boolean {
  return !result.conflict && isCandidate(result.score);
}

export { candidateStrength, isCandidate };
