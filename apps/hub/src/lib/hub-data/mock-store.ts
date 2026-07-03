import type { EntityType } from "@yna/core";
import { normalizeCompanyName } from "@yna/utils";
import { makeMasterCode, scoreMatch, toSearchResult, type StartupEditInput } from "./masters";
import { seedState, type MergeCandidateRow, type MockState } from "./mock-seed";
import type {
  AuditEntry,
  DashboardCounts,
  MasterAlias,
  MasterIdentifier,
  MasterSearchResult,
  MergeCandidateSummary,
  StartupDetail,
  StartupMaster,
} from "./types";

/**
 * dev 폴백(Supabase 미설정) 전용 in-memory mock 스토어.
 * (근거: 4_memo 이슈17·19·21) service/actions 가 이 스토어로 화면·감사 흐름을 구동한다.
 *
 * 식별자/별칭/필드이력/감사/중복후보는 엔티티(startup/expert/partner) 공용으로 다루고,
 * 스타트업/전문가/협력사 조회·변경은 이 위에서 얇게 조립한다(mock-masters.ts).
 */

/** 서브테이블·중복후보를 다루는 마스터 엔티티 종류. */
export type MasterEntity = "startup" | "expert" | "partner";

const g = globalThis as unknown as { __ynaHubMock?: MockState };
export function store(): MockState {
  if (!g.__ynaHubMock) g.__ynaHubMock = seedState();
  return g.__ynaHubMock;
}

export function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

const PENDING_VERIF = new Set(["pending", "temporary"]);

// ---- shared entity helpers ----

interface MasterRef {
  id: string;
  masterCode: string;
  name: string;
  normalizedName: string;
  status: string;
  updatedAt: string;
}

/** 엔티티 종류에 맞는 마스터 배열의 라이브 객체를 반환한다(변경/조회 공용). */
export function findMasterRef(entityType: MasterEntity, id: string): MasterRef | undefined {
  const s = store();
  const arr =
    entityType === "startup" ? s.startups : entityType === "expert" ? s.experts : s.partners;
  return arr.find((x) => x.id === id) as MasterRef | undefined;
}

function stripEntity<T extends { entityId: string }>(row: T): Omit<T, "entityId"> {
  const { entityId: _drop, ...rest } = clone(row);
  void _drop;
  return rest;
}

function toSummary(c: MergeCandidateRow, selfId: string): MergeCandidateSummary {
  const otherId = c.sourceId === selfId ? c.targetId : c.sourceId;
  const other = findMasterRef(c.entityType, otherId);
  return {
    id: c.id,
    otherId,
    otherMasterCode: other?.masterCode ?? otherId,
    otherName: other?.name ?? otherId,
    score: c.score,
    reasons: c.reasons,
    status: c.status,
  };
}

/** 상세 화면의 공통 섹션(식별자·별칭·필드이력·중복후보·감사)을 조립한다. */
export function subTables(entityType: MasterEntity, id: string) {
  const s = store();
  return {
    identifiers: s.identifiers.filter((i) => i.entityId === id).map(stripEntity),
    aliases: s.aliases.filter((a) => a.entityId === id).map(stripEntity),
    fieldHistory: s.fieldHistory
      .filter((h) => h.entityId === id)
      .sort((a, b) => (a.changedAt < b.changedAt ? 1 : -1))
      .map(stripEntity),
    mergeCandidates: s.mergeCandidates
      .filter((c) => c.entityType === entityType && (c.sourceId === id || c.targetId === id))
      .map((c) => toSummary(c, id)),
    auditSummary: s.audit
      .filter((au) => au.entityType === entityType && au.entityId === id)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 10),
  };
}

export function appendAudit(
  entityType: MasterEntity,
  action: string,
  entityId: string,
  actorName: string,
  reason: string | null,
): void {
  const s = store();
  s.audit.push({
    id: `au-${++s.auditSeq}`,
    actorName,
    action,
    entityType,
    entityId,
    reason,
    createdAt: new Date().toISOString(),
  });
}

export interface FieldChange {
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
}

function pushFieldHistory(
  entityId: string,
  change: FieldChange,
  reason: string,
  actor: string,
  at: string,
): void {
  const s = store();
  s.fieldHistory.push({
    id: `fh-${++s.idSeq}`,
    entityId,
    fieldName: change.fieldName,
    oldValue: change.oldValue,
    newValue: change.newValue,
    changeReason: reason,
    changedBy: actor,
    changedAt: at,
  });
}

// ---- generic mutations (startup/expert/partner) ----

/** 기본 정보 수정: 변경 필드마다 field_history + 단일 audit 기록. */
export function updateMasterFields(
  entityType: MasterEntity,
  id: string,
  patch: Record<string, unknown>,
  changes: FieldChange[],
  actorName: string,
  reason: string,
): boolean {
  const master = findMasterRef(entityType, id);
  if (!master) return false;
  Object.assign(master, patch);
  if (typeof patch.name === "string") master.normalizedName = normalizeCompanyName(master.name);
  master.updatedAt = new Date().toISOString();
  for (const c of changes) pushFieldHistory(id, c, reason, actorName, master.updatedAt);
  appendAudit(entityType, "update", id, actorName, reason);
  return true;
}

export function addIdentifierRow(
  entityType: MasterEntity,
  id: string,
  identifierType: string,
  identifierValue: string,
  normalizedValue: string,
  actorName: string,
  reason: string,
): boolean {
  if (!findMasterRef(entityType, id)) return false;
  const s = store();
  const row: MasterIdentifier & { entityId: string } = {
    id: `id-${++s.idSeq}`,
    entityId: id,
    identifierType,
    identifierValue,
    normalizedValue,
    isPrimary: false,
    sourceDomain: "hub",
    createdAt: new Date().toISOString(),
  };
  s.identifiers.push(row);
  appendAudit(entityType, "add_identifier", id, actorName, reason);
  return true;
}

export function addAliasRow(
  entityType: MasterEntity,
  id: string,
  aliasType: string,
  aliasValue: string,
  normalizedValue: string,
  actorName: string,
  reason: string,
): boolean {
  if (!findMasterRef(entityType, id)) return false;
  const s = store();
  const row: MasterAlias & { entityId: string } = {
    id: `al-${++s.idSeq}`,
    entityId: id,
    aliasType,
    aliasValue,
    normalizedValue,
    sourceDomain: "hub",
    createdAt: new Date().toISOString(),
  };
  s.aliases.push(row);
  appendAudit(entityType, "add_alias", id, actorName, reason);
  return true;
}

export function setMasterStatus(
  entityType: MasterEntity,
  id: string,
  status: "active" | "archived",
  actorName: string,
  reason: string,
): boolean {
  const master = findMasterRef(entityType, id);
  if (!master) return false;
  const before = master.status;
  master.status = status;
  master.updatedAt = new Date().toISOString();
  pushFieldHistory(
    id,
    { fieldName: "status", oldValue: before, newValue: status },
    reason,
    actorName,
    master.updatedAt,
  );
  appendAudit(entityType, "set_status", id, actorName, reason);
  return true;
}

// ---- startup reads ----

export function mockListStartups(): StartupMaster[] {
  return store().startups.map(clone);
}

export function mockGetStartupDetail(id: string): StartupDetail | null {
  const master = store().startups.find((x) => x.id === id);
  if (!master) return null;
  return {
    master: clone(master),
    ...subTables("startup", id),
    relatedWork: [
      { label: "Work 신청", count: 0 },
      { label: "멘토링 세션", count: 0 },
    ],
  };
}

export function mockSearchMasters(
  query: string,
  entityType: EntityType | "all",
  includeMerged: boolean,
  limit = 50,
): MasterSearchResult[] {
  const s = store();
  const results: MasterSearchResult[] = [];

  if (entityType === "all" || entityType === "startup") {
    for (const m of s.startups) {
      if (!includeMerged && m.status === "merged") continue;
      const extra = [
        ...s.aliases.filter((a) => a.entityId === m.id).map((a) => a.aliasValue),
        ...s.identifiers.filter((i) => i.entityId === m.id).map((i) => i.identifierValue),
      ];
      const { score, matched } = scoreMatch(query, [
        { field: "name", value: m.name },
        { field: "legal_name", value: m.legalName },
        { field: "representative_name", value: m.representativeName },
        ...extra.map((v, idx) => ({ field: idx < 1 ? "alias" : "identifier", value: v })),
      ]);
      if (score > 0) results.push(toSearchResult({ ...m, entityType: "startup" }, score, matched));
    }
  }
  if (entityType === "all" || entityType === "expert") {
    for (const m of s.experts) {
      if (!includeMerged && m.status === "merged") continue;
      const { score, matched } = scoreMatch(query, [
        { field: "name", value: m.name },
        { field: "email", value: m.email },
        { field: "organization", value: m.organization },
      ]);
      if (score > 0) results.push(toSearchResult({ ...m, entityType: "expert" }, score, matched));
    }
  }
  if (entityType === "all" || entityType === "partner") {
    for (const m of s.partners) {
      if (!includeMerged && m.status === "merged") continue;
      const { score, matched } = scoreMatch(query, [
        { field: "name", value: m.name },
        { field: "business_number", value: m.businessNumber },
        { field: "representative_name", value: m.representativeName },
      ]);
      if (score > 0) results.push(toSearchResult({ ...m, entityType: "partner" }, score, matched));
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function mockDashboardCounts(): DashboardCounts {
  const s = store();
  const pending = (m: { verificationStatus: string; status: string }) =>
    m.status !== "merged" && PENDING_VERIF.has(m.verificationStatus);
  return {
    startups: s.startups.filter((m) => m.status === "active").length,
    experts: s.experts.filter((m) => m.status === "active").length,
    partners: s.partners.filter((m) => m.status === "active").length,
    pendingMasters:
      s.startups.filter(pending).length +
      s.experts.filter(pending).length +
      s.partners.filter(pending).length,
    pendingMergeCandidates: s.mergeCandidates.filter((c) => c.status === "pending").length,
  };
}

export function mockRecentMergeEvents() {
  return clone(store().mergeEvents);
}

export function mockRecentImportBatches() {
  return clone(store().importBatches);
}

// ---- startup mutations (thin wrappers over generic) ----

export function mockUpdateStartup(
  id: string,
  next: StartupEditInput,
  changes: FieldChange[],
  actorName: string,
  reason: string,
): boolean {
  return updateMasterFields("startup", id, next, changes, actorName, reason);
}

export function mockAddIdentifier(
  id: string,
  identifierType: string,
  identifierValue: string,
  normalizedValue: string,
  actorName: string,
  reason: string,
): boolean {
  return addIdentifierRow("startup", id, identifierType, identifierValue, normalizedValue, actorName, reason);
}

export function mockAddAlias(
  id: string,
  aliasType: string,
  aliasValue: string,
  normalizedValue: string,
  actorName: string,
  reason: string,
): boolean {
  return addAliasRow("startup", id, aliasType, aliasValue, normalizedValue, actorName, reason);
}

export function mockSetStartupStatus(
  id: string,
  status: "active" | "archived",
  actorName: string,
  reason: string,
): boolean {
  return setMasterStatus("startup", id, status, actorName, reason);
}

export interface CreateStartupInput {
  name: string;
  legalName: string | null;
  representativeName: string | null;
  businessNumber: string | null;
  phone: string | null;
  email: string | null;
  sourceDomain: string;
}

/**
 * 신규(임시) 스타트업 마스터 생성. TEMP 코드·temporary 검증·audit 기록.
 * 중복 후보 자동 생성/식별자 파이프라인은 Phase 1.8/1.10 에서 연결한다(4_memo 이슈21).
 */
export function mockCreateStartup(input: CreateStartupInput, actorName: string): StartupMaster {
  const s = store();
  const seq = ++s.startupSeq;
  const now = new Date().toISOString();
  const master: StartupMaster = {
    id: `st-new-${seq}`,
    masterCode: makeMasterCode("startup", seq, true, 2026),
    name: input.name,
    legalName: input.legalName,
    normalizedName: normalizeCompanyName(input.name),
    businessNumber: input.businessNumber,
    corporationNumber: null,
    representativeName: input.representativeName,
    phone: input.phone,
    email: input.email,
    websiteUrl: null,
    address: null,
    industry: null,
    stage: null,
    sourceDomain: input.sourceDomain,
    verificationStatus: "temporary",
    status: "active",
    mergedIntoId: null,
    createdAt: now,
    updatedAt: now,
  };
  s.startups.push(master);
  appendAudit("startup", "create_temporary", master.id, actorName, "Hub 직접 신규 등록");
  return clone(master);
}

export function mockListAudit(): AuditEntry[] {
  return [...store().audit].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
