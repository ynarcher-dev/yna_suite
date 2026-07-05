import type { EntityType } from "@yna/core";
import {
  maskBusinessNumber,
  maskEmail,
  maskName,
  maskPhone,
  normalizeCompanyName,
} from "@yna/utils";
import { scoreMatch, toSearchResult, type StartupEditInput } from "./masters";
import { seedState, type MergeCandidateRow, type MockState } from "./mock-seed";
import type {
  AuditLogListItem,
  DashboardCounts,
  IdentifierVerifiedStatus,
  MasterAlias,
  MasterIdentifier,
  MasterSearchApiItem,
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

/** 감사 항목 부가 정보(before/after 스냅샷·요청 상관관계 ID). */
export interface AuditExtra {
  before?: unknown;
  after?: unknown;
  requestId?: string;
}

/** 감사 상관관계 ID. envelope(newRequestId)와 동일 포맷. */
export function newAuditRequestId(): string {
  return `req_${crypto.randomUUID()}`;
}

/** 민감 필드 키별 마스킹. 감사 before/after 에 개인정보 원문을 남기지 않는다(security §11). */
const SENSITIVE_AUDIT_FIELDS: Record<string, (v: string) => string> = {
  representativeName: maskName,
  businessNumber: maskBusinessNumber,
  corporationNumber: maskBusinessNumber,
  phone: maskPhone,
  email: maskEmail,
};

function maskAuditValue(fieldName: string, value: string | null): string | null {
  if (value == null || value === "") return value;
  const masker = SENSITIVE_AUDIT_FIELDS[fieldName];
  return masker ? masker(value) : value;
}

/** 필드 변경 목록에서 감사 before/after 스냅샷(민감 필드 마스킹)을 만든다. */
export function auditFieldSnapshot(changes: FieldChange[]): { before: Record<string, string | null>; after: Record<string, string | null> } {
  const before: Record<string, string | null> = {};
  const after: Record<string, string | null> = {};
  for (const c of changes) {
    before[c.fieldName] = maskAuditValue(c.fieldName, c.oldValue);
    after[c.fieldName] = maskAuditValue(c.fieldName, c.newValue);
  }
  return { before, after };
}

export function appendAudit(
  entityType: MasterEntity,
  action: string,
  entityId: string,
  actorName: string,
  reason: string | null,
  extra?: AuditExtra,
): void {
  const s = store();
  s.audit.push({
    id: `au-${++s.auditSeq}`,
    actorName,
    domainName: "hub",
    action,
    entityType,
    entityId,
    before: extra?.before ?? null,
    after: extra?.after ?? null,
    reason,
    requestId: extra?.requestId ?? newAuditRequestId(),
    createdAt: new Date().toISOString(),
  });
}

/**
 * 마스터 엔티티가 아닌 대상(import_batch 등)의 감사 기록.
 * (import 는 여러 마스터를 생성/연결하므로 batch 단위로 상관관계를 남긴다.)
 */
export function appendAuditFor(
  entityType: string,
  action: string,
  entityId: string,
  actorName: string,
  reason: string | null,
  extra?: AuditExtra,
): void {
  const s = store();
  s.audit.push({
    id: `au-${++s.auditSeq}`,
    actorName,
    domainName: "hub",
    action,
    entityType,
    entityId,
    before: extra?.before ?? null,
    after: extra?.after ?? null,
    reason,
    requestId: extra?.requestId ?? newAuditRequestId(),
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
  sourceDomain = "hub",
): void {
  const s = store();
  s.fieldHistory.push({
    id: `fh-${++s.idSeq}`,
    entityId,
    fieldName: change.fieldName,
    oldValue: change.oldValue,
    newValue: change.newValue,
    sourceDomain,
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
  appendAudit(entityType, "update", id, actorName, reason, auditFieldSnapshot(changes));
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
): string | null {
  if (!findMasterRef(entityType, id)) return null;
  const s = store();
  const rowId = `id-${++s.idSeq}`;
  const row: MasterIdentifier & { entityId: string } = {
    id: rowId,
    entityId: id,
    identifierType,
    identifierValue,
    normalizedValue,
    isPrimary: false,
    verifiedStatus: "unverified",
    sourceDomain: "hub",
    createdAt: new Date().toISOString(),
  };
  s.identifiers.push(row);
  appendAudit(entityType, "add_identifier", id, actorName, reason);
  return rowId;
}

export function addAliasRow(
  entityType: MasterEntity,
  id: string,
  aliasType: string,
  aliasValue: string,
  normalizedValue: string,
  actorName: string,
  reason: string,
): string | null {
  if (!findMasterRef(entityType, id)) return null;
  const s = store();
  const rowId = `al-${++s.idSeq}`;
  const row: MasterAlias & { entityId: string } = {
    id: rowId,
    entityId: id,
    aliasType,
    aliasValue,
    normalizedValue,
    sourceDomain: "hub",
    createdAt: new Date().toISOString(),
  };
  s.aliases.push(row);
  appendAudit(entityType, "add_alias", id, actorName, reason);
  return rowId;
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
  appendAudit(entityType, "set_status", id, actorName, reason, {
    before: { status: before },
    after: { status },
  });
  return true;
}

// ---- sub-record (identifier/alias) lookups & mutations ----

/** 식별자/별칭/원본조회 mutation 결과. */
export interface SubMutResult {
  ok: boolean;
  error?: string;
  /** 소유 마스터 엔티티(호출부의 재검증 경로 판단용). */
  entityType?: MasterEntity;
  /** 소유 마스터 id. */
  entityId?: string;
  /** reveal 시 원본 식별자 값. */
  value?: string;
}

type IdentifierRow = MasterIdentifier & { entityId: string };
type AliasRow = MasterAlias & { entityId: string };

export function findIdentifier(identifierId: string): IdentifierRow | undefined {
  return store().identifiers.find((i) => i.id === identifierId);
}

export function findAlias(aliasId: string): AliasRow | undefined {
  return store().aliases.find((a) => a.id === aliasId);
}

export function identifiersOf(entityId: string): IdentifierRow[] {
  return store().identifiers.filter((i) => i.entityId === entityId);
}

export function aliasesOf(entityId: string): AliasRow[] {
  return store().aliases.filter((a) => a.entityId === entityId);
}

/** entity_id 로 소유 마스터 엔티티 종류를 역참조한다(식별자/별칭 다형 참조). */
export function resolveEntityType(entityId: string): MasterEntity | undefined {
  const s = store();
  if (s.startups.some((x) => x.id === entityId)) return "startup";
  if (s.experts.some((x) => x.id === entityId)) return "expert";
  if (s.partners.some((x) => x.id === entityId)) return "partner";
  return undefined;
}

function ownerOf(entityId: string): { entityType: MasterEntity; status: string } | null {
  const entityType = resolveEntityType(entityId);
  if (!entityType) return null;
  const master = findMasterRef(entityType, entityId);
  if (!master) return null;
  return { entityType, status: master.status };
}

/**
 * 대표 식별자 지정(트랜잭션). 같은 (마스터, 식별자유형) 안에서 기존 primary 를 해제하고
 * 대상만 primary 로 설정한다. (근거: master_data_policy §5 — primary 변경은 기존 해제 포함 트랜잭션)
 */
export function setIdentifierPrimary(
  identifierId: string,
  actorName: string,
  reason: string,
): SubMutResult {
  const row = findIdentifier(identifierId);
  if (!row) return { ok: false, error: "식별자를 찾을 수 없습니다." };
  const owner = ownerOf(row.entityId);
  if (!owner) return { ok: false, error: "대상 마스터를 찾을 수 없습니다." };
  for (const i of store().identifiers) {
    if (i.entityId === row.entityId && i.identifierType === row.identifierType) {
      i.isPrimary = i.id === identifierId;
    }
  }
  appendAudit(owner.entityType, "set_primary", row.entityId, actorName, reason);
  return { ok: true, entityType: owner.entityType, entityId: row.entityId };
}

/** 식별자 검증 상태 변경(verified/rejected/unverified). */
export function setIdentifierVerification(
  identifierId: string,
  verifiedStatus: IdentifierVerifiedStatus,
  actorName: string,
  reason: string,
): SubMutResult {
  const row = findIdentifier(identifierId);
  if (!row) return { ok: false, error: "식별자를 찾을 수 없습니다." };
  const owner = ownerOf(row.entityId);
  if (!owner) return { ok: false, error: "대상 마스터를 찾을 수 없습니다." };
  row.verifiedStatus = verifiedStatus;
  appendAudit(owner.entityType, "verify_identifier", row.entityId, actorName, reason);
  return { ok: true, entityType: owner.entityType, entityId: row.entityId };
}

/** 식별자 삭제(원본에서 제거 + audit). 대표값에서 밀려난 값은 alias/identifier 로 별도 보존한다. */
export function removeIdentifier(
  identifierId: string,
  actorName: string,
  reason: string,
): SubMutResult {
  const s = store();
  const row = s.identifiers.find((i) => i.id === identifierId);
  if (!row) return { ok: false, error: "식별자를 찾을 수 없습니다." };
  const owner = ownerOf(row.entityId);
  if (!owner) return { ok: false, error: "대상 마스터를 찾을 수 없습니다." };
  s.identifiers = s.identifiers.filter((i) => i.id !== identifierId);
  appendAudit(owner.entityType, "remove_identifier", row.entityId, actorName, reason);
  return { ok: true, entityType: owner.entityType, entityId: row.entityId };
}

/** 별칭 삭제(원본에서 제거 + audit). (api_contracts §11) */
export function removeAlias(
  aliasId: string,
  actorName: string,
  reason: string,
): SubMutResult {
  const s = store();
  const row = s.aliases.find((a) => a.id === aliasId);
  if (!row) return { ok: false, error: "별칭을 찾을 수 없습니다." };
  const owner = ownerOf(row.entityId);
  if (!owner) return { ok: false, error: "대상 마스터를 찾을 수 없습니다." };
  s.aliases = s.aliases.filter((a) => a.id !== aliasId);
  appendAudit(owner.entityType, "remove_alias", row.entityId, actorName, reason);
  return { ok: true, entityType: owner.entityType, entityId: row.entityId };
}

/** 민감 식별자 원본 조회 — audit 기록 후 원본값을 반환한다. (규칙5 — 원본 조회는 권한자 + audit) */
export function revealIdentifier(
  identifierId: string,
  actorName: string,
  reason: string,
): SubMutResult {
  const row = findIdentifier(identifierId);
  if (!row) return { ok: false, error: "식별자를 찾을 수 없습니다." };
  const owner = ownerOf(row.entityId);
  if (!owner) return { ok: false, error: "대상 마스터를 찾을 수 없습니다." };
  appendAudit(owner.entityType, "view_sensitive", row.entityId, actorName, reason);
  return { ok: true, entityType: owner.entityType, entityId: row.entityId, value: row.identifierValue };
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

/** 검색 결과의 "이름 / 부가정보" 표시 라벨(엔티티별). (api_contracts §6 display_label) */
export function displayLabelOf(entityType: MasterEntity, id: string): string {
  const s = store();
  if (entityType === "startup") {
    const m = s.startups.find((x) => x.id === id);
    if (!m) return "";
    return m.representativeName ? `${m.name} / ${m.representativeName}` : m.name;
  }
  if (entityType === "expert") {
    const m = s.experts.find((x) => x.id === id);
    if (!m) return "";
    return m.organization ? `${m.name} / ${m.organization}` : m.name;
  }
  const p = s.partners.find((x) => x.id === id);
  if (!p) return "";
  return p.representativeName ? `${p.name} / ${p.representativeName}` : p.name;
}

/** 마스터 검색 API 항목(단일 entity_type, display_label 포함). (api_contracts §6) */
export function mockSearchApi(
  entityType: MasterEntity,
  q: string,
  includeMerged: boolean,
  limit: number,
): MasterSearchApiItem[] {
  return mockSearchMasters(q, entityType, includeMerged, limit).map((r) => ({
    ...r,
    displayLabel: displayLabelOf(entityType, r.id),
  }));
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

/** 대시보드 최근 import batch(운영 반영분만, 최신순). ImportBatch → RecentImportBatch 투영. */
export function mockRecentImportBatches() {
  return store()
    .importBatches.filter((b) => !b.isDryRun)
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))
    .slice(0, 5)
    .map((b) => ({
      id: b.id,
      sourceName: b.sourceName,
      entityType: b.entityType,
      status: b.status,
      totalRows: b.totalRows,
      processedRows: b.processedRows,
      failedRows: b.failedRows,
      startedAt: b.startedAt,
    }));
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

/** masterCode 를 붙인 대상 라벨(감사 조회 표시용). 마스터가 없으면 null. */
function auditEntityLabel(entityType: string, entityId: string | null): string | null {
  if (!entityId) return null;
  if (entityType !== "startup" && entityType !== "expert" && entityType !== "partner") return null;
  const master = findMasterRef(entityType, entityId);
  return master ? `${master.masterCode} · ${master.name}` : entityId;
}

/**
 * 감사 로그 조회(전 엔티티, 최신순). 로그는 append-only 이며 이 스토어에 수정/삭제 mutation 이 없다.
 * (근거: data_model §12, api_contracts §5)
 */
export function mockListAuditLogs(filter: {
  q?: string;
  entityType?: string;
  action?: string;
} = {}): AuditLogListItem[] {
  const q = filter.q?.trim().toLowerCase();
  return [...store().audit]
    .filter((e) => {
      if (filter.entityType && e.entityType !== filter.entityType) return false;
      if (filter.action && e.action !== filter.action) return false;
      if (q) {
        const hay = `${e.actorName} ${e.reason ?? ""} ${e.entityId ?? ""} ${e.requestId}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map((e) => ({ ...clone(e), entityLabel: auditEntityLabel(e.entityType, e.entityId) }));
}
