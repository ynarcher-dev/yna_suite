/**
 * 마스터 데이터 정규화 유틸.
 * (근거: yna_suite_master_data_policy.md, yna_suite_foldering.md §4 identifiers)
 *
 * 원본값은 보존하고, 검색/중복 판단에는 normalized 값을 사용한다.
 * 정규화 규칙이 바뀌면 재계산이 필요하므로 순수 함수로 유지한다.
 */

/** 공백 정리 + 소문자화. 검색 키 기본 정규화. */
export function normalizeText(input: string): string {
  return input.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * 회사명 정규화: 법인격 표기(주식회사 등)와 괄호/특수문자를 제거해 비교 키를 만든다.
 * 동일 회사의 표기 흔들림을 흡수하기 위한 검색용 키이며, 표시용이 아니다.
 */
export function normalizeCompanyName(input: string): string {
  return normalizeText(input)
    .replace(/\(주\)|\(유\)|주식회사|유한회사|㈜/g, "")
    .replace(/[^0-9a-z가-힣]+/g, "")
    .trim();
}

/** 사업자등록번호: 숫자만 추출(10자리). 유효성은 별도 검증. */
export function normalizeBusinessNumber(input: string): string {
  return input.replace(/\D/g, "");
}

/** 전화번호: 숫자만 추출. 국가/지역 표기 흔들림을 흡수한다. */
export function normalizePhone(input: string): string {
  return input.replace(/\D/g, "");
}

/** 이메일: trim + 소문자화. */
export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

/** 웹사이트 도메인만 추출(scheme/path/www 제거). */
export function normalizeWebsiteDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}
