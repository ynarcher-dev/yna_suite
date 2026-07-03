/**
 * import 컬럼 매핑(순수). (근거: yna_suite_migration_strategy.md §7·17)
 *
 * 기존 DB/엑셀/시트의 원본 컬럼명을 Hub 표준 필드로 변환한다.
 * 매핑되지 않는 원본 컬럼은 버리지 않고 raw_payload(preserved)로 보존한다(§7 — 비고 등).
 */

/** Hub 스타트업 마스터 표준 필드. */
export type StartupStandardField =
  | "name"
  | "team_name"
  | "legal_name"
  | "representative_name"
  | "business_number"
  | "corporation_number"
  | "phone"
  | "email"
  | "website_url"
  | "industry";

/**
 * 스타트업 import 컬럼 매핑표(원본 컬럼 → 표준 필드).
 * 원본 표기 흔들림(동의어)을 함께 수용한다. 여러 원본 컬럼이 같은 필드로 매핑되면 먼저 채워진 값을 쓴다.
 */
export const STARTUP_IMPORT_MAPPING: Record<string, StartupStandardField> = {
  회사명: "name",
  기업명: "name",
  스타트업명: "name",
  업체명: "name",
  팀명: "team_name",
  법인명: "legal_name",
  대표자: "representative_name",
  대표자명: "representative_name",
  대표: "representative_name",
  사업자번호: "business_number",
  사업자등록번호: "business_number",
  법인번호: "corporation_number",
  법인등록번호: "corporation_number",
  연락처: "phone",
  전화번호: "phone",
  대표전화: "phone",
  이메일: "email",
  대표이메일: "email",
  홈페이지: "website_url",
  웹사이트: "website_url",
  사이트: "website_url",
  산업분야: "industry",
  업종: "industry",
  분야: "industry",
};

export interface MappedRow {
  /** 표준 필드로 매핑된 값(빈 값 제외). */
  mapped: Partial<Record<StartupStandardField, string>>;
  /** 매핑되지 않은 원본 컬럼(raw_payload 보존 대상). */
  preserved: Record<string, unknown>;
}

/**
 * 원본 row 를 표준 필드로 매핑한다. 매핑 안 된 컬럼은 preserved 로 남긴다.
 * @param raw 원본 row(컬럼명→값)
 * @param mapping 컬럼 매핑표
 */
export function applyColumnMapping(
  raw: Record<string, unknown>,
  mapping: Record<string, StartupStandardField>,
): MappedRow {
  const mapped: Partial<Record<StartupStandardField, string>> = {};
  const preserved: Record<string, unknown> = {};
  for (const [col, value] of Object.entries(raw)) {
    const field = mapping[col.trim()];
    const text = value == null ? "" : String(value).trim();
    if (field) {
      if (text && !mapped[field]) mapped[field] = text;
    } else {
      preserved[col] = value;
    }
  }
  return { mapped, preserved };
}
