import type { EntityType } from "@yna/core";
import { normalizeCompanyName } from "@yna/utils";
import type { MasterSearchResult, SimpleMaster, StartupMaster } from "./types";

/**
 * 스타트업 마스터 관련 순수 헬퍼(코드 발급·수정 필드·검색 점수).
 * (근거: yna_suite_data_model.md §3, yna_suite_api_contracts.md §6~9)
 * 순수 함수라 서버·테스트에서 재사용한다.
 */

const ENTITY_ABBR: Record<EntityType, string> = {
  startup: "ST",
  expert: "EX",
  partner: "PT",
  manager: "MG",
};

/**
 * 사람이 보는 master_code 발급. 검증 전 임시 마스터는 TEMP 접두를 붙인다.
 * 예: YNA-ST-2026-0001 / TEMP-ST-2026-0092.
 */
export function makeMasterCode(
  entityType: EntityType,
  seq: number,
  temporary: boolean,
  year: number,
): string {
  const prefix = temporary ? "TEMP" : "YNA";
  const num = String(seq).padStart(4, "0");
  return `${prefix}-${ENTITY_ABBR[entityType]}-${year}-${num}`;
}

/** 상세 화면에서 수정 가능한 스타트업 기본 필드 정의. field_history 기록 기준이 된다. */
export const EDITABLE_STARTUP_FIELDS = [
  { key: "name", label: "표시명", sensitive: false },
  { key: "legalName", label: "법인명", sensitive: false },
  { key: "representativeName", label: "대표자명", sensitive: true },
  { key: "businessNumber", label: "사업자번호", sensitive: true },
  { key: "corporationNumber", label: "법인등록번호", sensitive: true },
  { key: "phone", label: "대표 연락처", sensitive: true },
  { key: "email", label: "대표 이메일", sensitive: true },
  { key: "websiteUrl", label: "홈페이지", sensitive: false },
  { key: "address", label: "주소", sensitive: false },
  { key: "industry", label: "산업분류", sensitive: false },
  { key: "stage", label: "성장단계", sensitive: false },
] as const;

export type EditableStartupField = (typeof EDITABLE_STARTUP_FIELDS)[number]["key"];

/** 수정 폼이 다루는 필드 값 집합. */
export type StartupEditInput = Record<EditableStartupField, string | null>;

/** 마스터에서 수정 대상 필드만 추출한다. */
export function extractEditable(master: StartupMaster): StartupEditInput {
  return {
    name: master.name,
    legalName: master.legalName,
    representativeName: master.representativeName,
    businessNumber: master.businessNumber,
    corporationNumber: master.corporationNumber,
    phone: master.phone,
    email: master.email,
    websiteUrl: master.websiteUrl,
    address: master.address,
    industry: master.industry,
    stage: master.stage,
  };
}

/** 민감 필드가 변경되었는지(감사 로그 필수 판단용). */
export function hasSensitiveChange(
  before: StartupEditInput,
  after: StartupEditInput,
): boolean {
  return EDITABLE_STARTUP_FIELDS.some(
    (f) => f.sensitive && norm(before[f.key]) !== norm(after[f.key]),
  );
}

function norm(v: string | null): string {
  return (v ?? "").trim();
}

/**
 * 통합 검색 점수(0~100). name/legal_name/normalized/alias/identifier/representative 대상.
 * 정확 일치 > 접두 일치 > 부분 일치 순으로 가중한다. 실제 DB 검색은 Phase 1.8 에서 대체한다.
 */
export function scoreMatch(
  query: string,
  fields: { field: string; value: string | null }[],
): { score: number; matched: string[] } {
  const q = normalizeCompanyName(query) || query.trim().toLowerCase();
  if (!q) return { score: 0, matched: [] };
  let best = 0;
  const matched: string[] = [];
  for (const { field, value } of fields) {
    if (!value) continue;
    const v = normalizeCompanyName(value) || value.trim().toLowerCase();
    if (!v) continue;
    let s = 0;
    if (v === q) s = 100;
    else if (v.startsWith(q) || q.startsWith(v)) s = 85;
    else if (v.includes(q) || q.includes(v)) s = 70;
    if (s > 0) {
      matched.push(field);
      if (s > best) best = s;
    }
  }
  return { score: best, matched };
}

/** SimpleMaster/StartupMaster 를 검색 결과 형태로 투영한다. */
export function toSearchResult(
  m: Pick<
    SimpleMaster,
    "id" | "entityType" | "masterCode" | "name" | "verificationStatus" | "status"
  >,
  score: number,
  matched: string[],
): MasterSearchResult {
  return {
    id: m.id,
    entityType: m.entityType,
    masterCode: m.masterCode,
    name: m.name,
    verificationStatus: m.verificationStatus,
    status: m.status,
    matchedFields: matched,
    score,
  };
}
