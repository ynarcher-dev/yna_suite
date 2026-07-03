import type { MasterEntity } from "./mock-store";
import type { MasterSearchApiItem, TemporaryMasterInput, TemporaryMasterResult } from "./types";

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
