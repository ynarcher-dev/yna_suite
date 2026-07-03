import type { MasterEntity } from "./mock-store";
import type {
  IdentifierVerifiedStatus,
  MasterAlias,
  MasterIdentifier,
  MasterSearchApiItem,
  MergeCandidateListItem,
  MergeEntityRef,
  MergeEntitySnapshot,
  MergePreview,
  TemporaryMasterInput,
  TemporaryMasterResult,
} from "./types";

const VERIFIED_STATUSES: readonly IdentifierVerifiedStatus[] = ["unverified", "verified", "rejected"];

export function isVerifiedStatus(v: unknown): v is IdentifierVerifiedStatus {
  return typeof v === "string" && (VERIFIED_STATUSES as readonly string[]).includes(v);
}

/**
 * API 경계의 snake_case ↔ 내부 camelCase 매핑(순수).
 * (근거: api_contracts §3 entity_type, §6 검색, §7 임시 마스터)
 */

export const MASTER_ENTITIES = ["startup", "expert", "partner"] as const;

export function isMasterEntity(v: unknown): v is MasterEntity {
  return typeof v === "string" && (MASTER_ENTITIES as readonly string[]).includes(v);
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

/** 식별자 생성 요청 body(snake_case) → 내부 입력. 검증은 라우트가 담당한다. (api_contracts §10) */
export function mapAddIdentifierBody(body: Record<string, unknown>) {
  return {
    identifierType: str(body.identifier_type),
    identifierValue: str(body.identifier_value),
    isPrimary: body.is_primary === true,
    reason: str(body.reason) ?? "API 식별자 추가",
  };
}

/** 별칭 생성 요청 body(snake_case) → 내부 입력. (api_contracts §11) */
export function mapAddAliasBody(body: Record<string, unknown>) {
  return {
    aliasType: str(body.alias_type),
    aliasValue: str(body.alias_value),
    reason: str(body.reason) ?? "API 별칭 추가",
  };
}

/** 식별자 PATCH 요청 body(snake_case) → 내부 입력. (api_contracts §10) */
export function mapPatchIdentifierBody(body: Record<string, unknown>) {
  return {
    isPrimary: body.is_primary === true ? true : undefined,
    verifiedStatus: isVerifiedStatus(body.verified_status) ? body.verified_status : undefined,
    reason: str(body.reason) ?? "API 식별자 변경",
  };
}

/** DELETE 요청의 사유(body 또는 기본값). */
export function deleteReason(body: Record<string, unknown> | null): string {
  return (body && str(body.reason)) ?? "API 삭제";
}

/** 검색 결과 항목을 API(snake_case) 형태로 투영한다. */
export function toSearchApiItem(item: MasterSearchApiItem) {
  return {
    id: item.id,
    entity_type: item.entityType,
    master_code: item.masterCode,
    name: item.name,
    display_label: item.displayLabel,
    verification_status: item.verificationStatus,
    status: item.status,
    matched_fields: item.matchedFields,
    score: item.score,
  };
}

/** 임시 마스터 생성 결과를 API(snake_case) 형태로 투영한다. */
export function toTemporaryApiData(result: TemporaryMasterResult) {
  return {
    id: result.id,
    entity_type: result.entityType,
    master_code: result.masterCode,
    verification_status: result.verificationStatus,
    status: result.status,
    merge_candidate_count: result.mergeCandidateCount,
  };
}

/** 식별자 행을 API(snake_case) 형태로 투영한다. (api_contracts §10) */
export function toIdentifierApiData(row: MasterIdentifier) {
  return {
    id: row.id,
    identifier_type: row.identifierType,
    identifier_value: row.identifierValue,
    normalized_value: row.normalizedValue,
    is_primary: row.isPrimary,
    verified_status: row.verifiedStatus,
    source_domain: row.sourceDomain,
    created_at: row.createdAt,
  };
}

/** 별칭 행을 API(snake_case) 형태로 투영한다. (api_contracts §11) */
export function toAliasApiData(row: MasterAlias) {
  return {
    id: row.id,
    alias_type: row.aliasType,
    alias_value: row.aliasValue,
    normalized_value: row.normalizedValue,
    source_domain: row.sourceDomain,
    created_at: row.createdAt,
  };
}

// ---- merge candidate mapping (api_contracts §12~15) ----

function refApi(ref: MergeEntityRef) {
  return {
    id: ref.id,
    master_code: ref.masterCode,
    name: ref.name,
    verification_status: ref.verificationStatus,
    status: ref.status,
  };
}

/** 병합 후보 목록 항목을 API(snake_case) 형태로 투영한다. (api_contracts §12) */
export function toMergeCandidateApiItem(item: MergeCandidateListItem) {
  return {
    id: item.id,
    entity_type: item.entityType,
    source_entity: refApi(item.source),
    target_entity: refApi(item.target),
    score: item.score,
    reasons: item.reasons,
    status: item.status,
    created_at: item.createdAt,
  };
}

function snapshotApi(s: MergeEntitySnapshot) {
  return {
    entity: refApi(s.ref),
    fields: s.fields.map((f) => ({ key: f.key, label: f.label, value: f.value, sensitive: f.sensitive })),
    identifiers: s.identifiers.map(toIdentifierApiData),
    aliases: s.aliases.map(toAliasApiData),
    related_work: s.relatedWork.map((r) => ({ label: r.label, count: r.count })),
  };
}

/** 병합 미리보기를 API(snake_case) 형태로 투영한다. (api_contracts §13) */
export function toMergePreviewApiData(preview: MergePreview) {
  return {
    source_entity_id: preview.sourceEntityId,
    target_entity_id: preview.targetEntityId,
    field_resolution: preview.fieldResolution.map((r) => ({
      field: r.field,
      label: r.label,
      policy: r.policy,
      source: r.source,
      target: r.target,
      selected: r.selected,
    })),
    affected_records: preview.affectedRecords,
    warnings: preview.warnings,
    blocked: preview.blocked,
  };
}

/** 병합 후보 상세(좌우 비교 + 미리보기) API 투영. */
export function toMergeCandidateDetailApiData(detail: {
  id: string;
  entityType: string;
  score: number;
  reasons: string[];
  status: string;
  createdAt: string;
  source: MergeEntitySnapshot;
  target: MergeEntitySnapshot;
  preview: MergePreview;
}) {
  return {
    id: detail.id,
    entity_type: detail.entityType,
    score: detail.score,
    reasons: detail.reasons,
    status: detail.status,
    created_at: detail.createdAt,
    source: snapshotApi(detail.source),
    target: snapshotApi(detail.target),
    preview: toMergePreviewApiData(detail.preview),
  };
}

/** field_policy override(snake_case 필드 그대로 사용) 를 추출한다. */
export function mapFieldPolicy(raw: unknown): Record<string, string> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string" && v.trim()) out[k] = v.trim();
  }
  return Object.keys(out).length ? out : undefined;
}

function mapPairs(
  raw: unknown,
  keyA: string,
  keyB: string,
): { a: string; b: string }[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: { a: string; b: string }[] = [];
  for (const item of raw) {
    if (item && typeof item === "object") {
      const a = str((item as Record<string, unknown>)[keyA]);
      const b = str((item as Record<string, unknown>)[keyB]);
      if (a && b) out.push({ a, b });
    }
  }
  return out.length ? out : undefined;
}

/**
 * 임시 마스터 생성 요청 body(snake_case) → 내부 입력. name 검증은 라우트가 담당한다.
 */
export function mapTemporaryBody(body: Record<string, unknown>): TemporaryMasterInput {
  const tags = Array.isArray(body.expertise_tags)
    ? (body.expertise_tags as unknown[]).filter((t): t is string => typeof t === "string")
    : undefined;
  const identifiers = mapPairs(body.identifiers, "identifier_type", "identifier_value")?.map((p) => ({
    identifierType: p.a,
    identifierValue: p.b,
  }));
  const aliases = mapPairs(body.aliases, "alias_type", "alias_value")?.map((p) => ({
    aliasType: p.a,
    aliasValue: p.b,
  }));
  return {
    name: typeof body.name === "string" ? body.name.trim() : "",
    legalName: str(body.legal_name),
    representativeName: str(body.representative_name),
    businessNumber: str(body.business_number),
    phone: str(body.phone),
    email: str(body.email),
    websiteUrl: str(body.website_url),
    partnerType: str(body.partner_type),
    organization: str(body.organization),
    position: str(body.position),
    expertiseTags: tags,
    sourceDomain: str(body.source_domain) ?? "hub",
    sourceRecordId: str(body.source_record_id),
    identifiers,
    aliases,
  };
}
