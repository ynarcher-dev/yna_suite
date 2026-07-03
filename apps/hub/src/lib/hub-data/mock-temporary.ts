import { normalizeCompanyName } from "@yna/utils";
import {
  scoreDuplicateCandidate,
  shouldProposeCandidate,
  type ComparableMaster,
} from "@yna/master-data";
import { makeMasterCode, normalizeIdentifierValue, normalizePersonName } from "./masters";
import type { MergeCandidateRow } from "./mock-seed";
import { appendAudit, store, type MasterEntity } from "./mock-store";
import type {
  ExpertMaster,
  MasterAlias,
  MasterIdentifier,
  StartupMaster,
  PartnerMaster,
  TemporaryMasterInput,
  TemporaryMasterResult,
} from "./types";

/**
 * 임시(TEMP) 마스터 생성 + 중복 후보 자동 생성(mock seam).
 * (근거: yna_suite_api_contracts.md §7, yna_suite_master_data_policy.md §7~9·13)
 *
 * 처리: validation(호출부) → normalized 생성 → TEMP 마스터 생성 →
 * 식별자/별칭 저장 → 규칙 기반 중복 후보 생성 → audit log.
 * Docker/staging 연결 시 이 로직은 hub.create_temporary_master RPC 로 교체한다(이슈21).
 */

type AnyMaster = StartupMaster | ExpertMaster | PartnerMaster;

function listOf(entityType: MasterEntity): AnyMaster[] {
  const s = store();
  if (entityType === "startup") return s.startups;
  if (entityType === "expert") return s.experts;
  return s.partners;
}

const ID_PREFIX: Record<MasterEntity, string> = {
  startup: "st-new",
  expert: "ex-new",
  partner: "pt-new",
};

function nextSeq(entityType: MasterEntity): number {
  const s = store();
  if (entityType === "startup") return ++s.startupSeq;
  if (entityType === "expert") return ++s.expertSeq;
  return ++s.partnerSeq;
}

/** 마스터의 정규화된 비교 필드를 조립한다(식별자 우선, 없으면 마스터 필드). */
function comparableOf(entityType: MasterEntity, id: string): ComparableMaster {
  const m = listOf(entityType).find((x) => x.id === id);
  const ids = store().identifiers.filter((i) => i.entityId === id);
  const byType = (t: string) => ids.find((i) => i.identifierType === t)?.normalizedValue ?? null;
  const rep = "representativeName" in m! ? m!.representativeName : null;
  const biz = "businessNumber" in m! ? m!.businessNumber : null;
  const corp = "corporationNumber" in m! ? m!.corporationNumber : null;
  const phone = "phone" in m! ? m!.phone : null;
  const email = "email" in m! ? m!.email : null;
  const website = "websiteUrl" in m! ? m!.websiteUrl : null;
  return {
    normalizedName: m!.normalizedName,
    representativeName: normalizePersonName(rep),
    businessNumber: byType("business_number") ?? (biz ? normalizeIdentifierValue("business_number", biz) : null),
    corporationNumber:
      byType("corporation_number") ?? (corp ? normalizeIdentifierValue("corporation_number", corp) : null),
    phone: byType("founder_phone") ?? byType("phone") ?? (phone ? normalizeIdentifierValue("phone", phone) : null),
    email: byType("founder_email") ?? byType("email") ?? (email ? normalizeIdentifierValue("email", email) : null),
    websiteDomain:
      byType("website_domain") ?? (website ? normalizeIdentifierValue("website_domain", website) : null),
  };
}

/** 엔티티별 마스터 레코드 생성. */
function buildMaster(
  entityType: MasterEntity,
  id: string,
  masterCode: string,
  input: TemporaryMasterInput,
  now: string,
): AnyMaster {
  const common = {
    id,
    masterCode,
    name: input.name,
    normalizedName: normalizeCompanyName(input.name),
    sourceDomain: input.sourceDomain,
    verificationStatus: "temporary" as const,
    status: "active" as const,
    mergedIntoId: null,
    createdAt: now,
    updatedAt: now,
  };
  if (entityType === "startup") {
    const m: StartupMaster = {
      ...common,
      legalName: input.legalName ?? null,
      businessNumber: input.businessNumber ?? null,
      corporationNumber: null,
      representativeName: input.representativeName ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      websiteUrl: input.websiteUrl ?? null,
      address: null,
      industry: null,
      stage: null,
    };
    return m;
  }
  if (entityType === "expert") {
    const m: ExpertMaster = {
      ...common,
      email: input.email ?? null,
      phone: input.phone ?? null,
      organization: input.organization ?? null,
      position: input.position ?? null,
      expertiseTags: input.expertiseTags ?? [],
    };
    return m;
  }
  const m: PartnerMaster = {
    ...common,
    partnerType: input.partnerType ?? null,
    businessNumber: input.businessNumber ?? null,
    representativeName: input.representativeName ?? null,
    phone: input.phone ?? null,
    email: input.email ?? null,
    websiteUrl: input.websiteUrl ?? null,
    address: null,
  };
  return m;
}

/** 최상위 필드에서 파생할 식별자 목록(엔티티별). */
function derivedIdentifiers(
  entityType: MasterEntity,
  input: TemporaryMasterInput,
): { identifierType: string; identifierValue: string }[] {
  const out: { identifierType: string; identifierValue: string }[] = [];
  const add = (t: string, v: string | null | undefined) => {
    if (v && v.trim()) out.push({ identifierType: t, identifierValue: v.trim() });
  };
  if (entityType === "expert") {
    add("email", input.email);
    add("phone", input.phone);
  } else {
    add("business_number", input.businessNumber);
    add("founder_phone", input.phone);
    add("founder_email", input.email);
    add("website_domain", input.websiteUrl);
  }
  return out;
}

function insertIdentifiers(
  id: string,
  rows: { identifierType: string; identifierValue: string }[],
): void {
  const s = store();
  for (const r of rows) {
    const value = r.identifierValue.trim();
    if (!value) continue;
    const normalized = normalizeIdentifierValue(r.identifierType, value);
    const dup = s.identifiers.some(
      (i) => i.entityId === id && i.identifierType === r.identifierType && i.normalizedValue === normalized,
    );
    if (dup) continue;
    const row: MasterIdentifier & { entityId: string } = {
      id: `id-${++s.idSeq}`,
      entityId: id,
      identifierType: r.identifierType,
      identifierValue: value,
      normalizedValue: normalized,
      isPrimary: false,
      sourceDomain: "hub",
      createdAt: new Date().toISOString(),
    };
    s.identifiers.push(row);
  }
}

function insertAliases(
  id: string,
  rows: { aliasType: string; aliasValue: string }[] | undefined,
): void {
  if (!rows) return;
  const s = store();
  for (const r of rows) {
    const value = r.aliasValue.trim();
    if (!value) continue;
    const normalized = normalizeCompanyName(value);
    const dup = s.aliases.some(
      (a) => a.entityId === id && a.aliasType === r.aliasType && a.normalizedValue === normalized,
    );
    if (dup) continue;
    const row: MasterAlias & { entityId: string } = {
      id: `al-${++s.idSeq}`,
      entityId: id,
      aliasType: r.aliasType,
      aliasValue: value,
      normalizedValue: normalized,
      sourceDomain: "hub",
      createdAt: new Date().toISOString(),
    };
    s.aliases.push(row);
  }
}

/**
 * 신규 마스터와 같은 엔티티의 기존 활성 마스터를 비교해 중복 후보를 생성한다.
 * 점수 60 이상·충돌 없음만 pending 후보로 만든다(자동 병합 금지, 승인은 Phase 1.10).
 */
function generateCandidates(entityType: MasterEntity, newId: string): number {
  const s = store();
  const mine = comparableOf(entityType, newId);
  const now = new Date().toISOString();
  let count = 0;
  for (const other of listOf(entityType)) {
    if (other.id === newId) continue;
    if (other.status === "merged" || other.status === "archived") continue;
    const result = scoreDuplicateCandidate(mine, comparableOf(entityType, other.id));
    if (!shouldProposeCandidate(result)) continue;
    const row: MergeCandidateRow = {
      id: `mc-${++s.idSeq}`,
      entityType,
      sourceId: newId,
      targetId: other.id,
      score: result.score,
      reasons: result.reasons,
      status: "pending",
      createdAt: now,
    };
    s.mergeCandidates.push(row);
    count += 1;
  }
  return count;
}

/**
 * 임시 마스터를 생성한다. TEMP 코드·temporary 검증·audit 기록 후 중복 후보를 자동 생성한다.
 * @returns 생성 결과 요약(중복 후보 수 포함).
 */
export function mockCreateTemporaryMaster(
  entityType: MasterEntity,
  input: TemporaryMasterInput,
  actorName: string,
): TemporaryMasterResult {
  const seq = nextSeq(entityType);
  const now = new Date().toISOString();
  const id = `${ID_PREFIX[entityType]}-${seq}`;
  const masterCode = makeMasterCode(entityType, seq, true, 2026);

  const master = buildMaster(entityType, id, masterCode, input, now);
  listOf(entityType).push(master);

  const identifiers = [...derivedIdentifiers(entityType, input), ...(input.identifiers ?? [])];
  insertIdentifiers(id, identifiers);
  insertAliases(id, input.aliases);

  const mergeCandidateCount = generateCandidates(entityType, id);

  const reason = input.sourceRecordId
    ? `${input.sourceDomain} 유입 임시 마스터 (${input.sourceRecordId})`
    : `${input.sourceDomain} 직접 신규 등록`;
  appendAudit(entityType, "create_temporary", id, actorName, reason);

  return {
    id,
    entityType,
    masterCode,
    verificationStatus: "temporary",
    status: "active",
    mergeCandidateCount,
  };
}
