import type { MergeFieldPolicy } from "@yna/master-data";
import type { MasterEntity } from "./mock-store";

/**
 * 병합 시 필드별 대표값 정책(엔티티별). (근거: yna_suite_master_data_policy.md §14)
 * 순수 설정 — 좌우 비교 스냅샷·미리보기 field_resolution·승인 적용이 공유한다.
 */

export interface MergeFieldSpec {
  key: string;
  label: string;
  policy: MergeFieldPolicy;
  /** 목록/비교 화면 마스킹 대상(사업자번호·연락처·이메일 등). */
  sensitive: boolean;
}

const STARTUP_FIELDS: MergeFieldSpec[] = [
  { key: "name", label: "표시명", policy: "target", sensitive: false },
  { key: "legalName", label: "법인명", policy: "prefer_filled", sensitive: false },
  { key: "businessNumber", label: "사업자번호", policy: "prefer_filled", sensitive: true },
  { key: "corporationNumber", label: "법인등록번호", policy: "prefer_filled", sensitive: true },
  { key: "representativeName", label: "대표자명", policy: "target", sensitive: true },
  { key: "phone", label: "대표 연락처", policy: "target", sensitive: true },
  { key: "email", label: "대표 이메일", policy: "target", sensitive: true },
  { key: "websiteUrl", label: "홈페이지", policy: "prefer_filled", sensitive: false },
  { key: "address", label: "주소", policy: "prefer_filled", sensitive: false },
  { key: "industry", label: "산업분류", policy: "union", sensitive: false },
  { key: "stage", label: "성장단계", policy: "target", sensitive: false },
];

const EXPERT_FIELDS: MergeFieldSpec[] = [
  { key: "name", label: "이름", policy: "target", sensitive: false },
  { key: "email", label: "이메일", policy: "target", sensitive: true },
  { key: "phone", label: "연락처", policy: "target", sensitive: true },
  { key: "organization", label: "소속", policy: "target", sensitive: false },
  { key: "position", label: "직함", policy: "target", sensitive: false },
  { key: "expertiseTags", label: "전문 분야", policy: "union", sensitive: false },
];

const PARTNER_FIELDS: MergeFieldSpec[] = [
  { key: "name", label: "기관명", policy: "target", sensitive: false },
  { key: "partnerType", label: "기관유형", policy: "target", sensitive: false },
  { key: "businessNumber", label: "사업자번호", policy: "prefer_filled", sensitive: true },
  { key: "representativeName", label: "대표자명", policy: "target", sensitive: true },
  { key: "phone", label: "대표 연락처", policy: "target", sensitive: true },
  { key: "email", label: "대표 이메일", policy: "target", sensitive: true },
  { key: "websiteUrl", label: "홈페이지", policy: "prefer_filled", sensitive: false },
  { key: "address", label: "주소", policy: "prefer_filled", sensitive: false },
];

export const MERGE_FIELD_SPECS: Record<MasterEntity, MergeFieldSpec[]> = {
  startup: STARTUP_FIELDS,
  expert: EXPERT_FIELDS,
  partner: PARTNER_FIELDS,
};

/** 마스터 필드 값을 비교/이력용 문자열로 변환(배열은 콤마 결합). */
export function fieldToString(master: Record<string, unknown>, key: string): string | null {
  const raw = master[key];
  if (raw == null) return null;
  if (Array.isArray(raw)) return raw.length ? raw.join(", ") : null;
  const s = String(raw).trim();
  return s === "" ? null : s;
}

/** 문자열 대표값을 마스터 필드에 적용(배열형 필드는 콤마 분해). */
export function applyFieldValue(master: Record<string, unknown>, key: string, value: string | null): void {
  if (key === "expertiseTags") {
    master[key] = value ? value.split(",").map((t) => t.trim()).filter(Boolean) : [];
    return;
  }
  master[key] = value;
}
