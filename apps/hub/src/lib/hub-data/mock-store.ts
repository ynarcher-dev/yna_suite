import type { EntityType } from "@yna/core";
import { normalizeCompanyName } from "@yna/utils";
import { makeMasterCode, scoreMatch, toSearchResult, type StartupEditInput } from "./masters";
import { seedState, type MergeCandidateRow, type MockState } from "./mock-seed";
import type {
  AuditEntry,
  DashboardCounts,
  MasterSearchResult,
  MergeCandidateSummary,
  StartupDetail,
  StartupMaster,
} from "./types";

/**
 * dev 폴백(Supabase 미설정) 전용 in-memory mock 스토어.
 * (근거: 4_memo 이슈17·19) service/actions 가 이 스토어로 화면·감사 흐름을 구동한다.
 */

const g = globalThis as unknown as { __ynaHubMock?: MockState };
function store(): MockState {
  if (!g.__ynaHubMock) g.__ynaHubMock = seedState();
  return g.__ynaHubMock;
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

const PENDING_VERIF = new Set(["pending", "temporary"]);

// ---- reads ----

export function mockListStartups(): StartupMaster[] {
  return store().startups.map(clone);
}

export function mockGetStartupDetail(id: string): StartupDetail | null {
  const s = store();
  const master = s.startups.find((x) => x.id === id);
  if (!master) return null;
  return {
    master: clone(master),
    identifiers: s.identifiers.filter((i) => i.entityId === id).map(stripEntity),
    aliases: s.aliases.filter((a) => a.entityId === id).map(stripEntity),
    fieldHistory: s.fieldHistory
      .filter((h) => h.entityId === id)
      .sort((a, b) => (a.changedAt < b.changedAt ? 1 : -1))
      .map(stripEntity),
    mergeCandidates: candidatesFor(id).map((c) => toSummary(c, id)),
    auditSummary: s.audit
      .filter((au) => au.entityType === "startup" && au.entityId === id)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 10),
    relatedWork: [
      { label: "Work 신청", count: 0 },
      { label: "멘토링 세션", count: 0 },
    ],
  };
}

function candidatesFor(id: string): MergeCandidateRow[] {
  return store().mergeCandidates.filter((c) => c.sourceId === id || c.targetId === id);
}

function toSummary(c: MergeCandidateRow, selfId: string): MergeCandidateSummary {
  const s = store();
  const otherId = c.sourceId === selfId ? c.targetId : c.sourceId;
  const other = s.startups.find((x) => x.id === otherId);
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

function stripEntity<T extends { entityId: string }>(row: T): Omit<T, "entityId"> {
  const { entityId: _drop, ...rest } = clone(row);
  void _drop;
  return rest;
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
  for (const et of ["expert", "partner"] as const) {
    if (entityType !== "all" && entityType !== et) continue;
    const list = et === "expert" ? s.experts : s.partners;
    for (const m of list) {
      if (!includeMerged && m.status === "merged") continue;
      const { score, matched } = scoreMatch(query, [{ field: "name", value: m.name }]);
      if (score > 0) results.push(toSearchResult(m, score, matched));
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

// ---- mutations ----

export interface FieldChange {
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
}

function appendAudit(
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
    entityType: "startup",
    entityId,
    reason,
    createdAt: new Date().toISOString(),
  });
}

/** 기본 정보 수정: 변경 필드마다 field_history + 단일 audit 기록. */
export function mockUpdateStartup(
  id: string,
  next: StartupEditInput,
  changes: FieldChange[],
  actorName: string,
  reason: string,
): StartupMaster | null {
  const s = store();
  const master = s.startups.find((x) => x.id === id);
  if (!master) return null;
  Object.assign(master, next);
  master.normalizedName = normalizeCompanyName(master.name);
  master.updatedAt = new Date().toISOString();
  const now = master.updatedAt;
  for (const c of changes) {
    s.fieldHistory.push({
      id: `fh-${++s.idSeq}`,
      entityId: id,
      fieldName: c.fieldName,
      oldValue: c.oldValue,
      newValue: c.newValue,
      changeReason: reason,
      changedBy: actorName,
      changedAt: now,
    });
  }
  appendAudit("update", id, actorName, reason);
  return clone(master);
}

export function mockAddIdentifier(
  id: string,
  identifierType: string,
  identifierValue: string,
  normalizedValue: string,
  actorName: string,
  reason: string,
): boolean {
  const s = store();
  if (!s.startups.some((x) => x.id === id)) return false;
  s.identifiers.push({
    id: `id-${++s.idSeq}`,
    entityId: id,
    identifierType,
    identifierValue,
    normalizedValue,
    isPrimary: false,
    sourceDomain: "hub",
    createdAt: new Date().toISOString(),
  });
  appendAudit("add_identifier", id, actorName, reason);
  return true;
}

export function mockAddAlias(
  id: string,
  aliasType: string,
  aliasValue: string,
  normalizedValue: string,
  actorName: string,
  reason: string,
): boolean {
  const s = store();
  if (!s.startups.some((x) => x.id === id)) return false;
  s.aliases.push({
    id: `al-${++s.idSeq}`,
    entityId: id,
    aliasType,
    aliasValue,
    normalizedValue,
    sourceDomain: "hub",
    createdAt: new Date().toISOString(),
  });
  appendAudit("add_alias", id, actorName, reason);
  return true;
}

export function mockSetStartupStatus(
  id: string,
  status: StartupMaster["status"],
  actorName: string,
  reason: string,
): StartupMaster | null {
  const s = store();
  const master = s.startups.find((x) => x.id === id);
  if (!master) return null;
  const before = master.status;
  master.status = status;
  master.updatedAt = new Date().toISOString();
  s.fieldHistory.push({
    id: `fh-${++s.idSeq}`,
    entityId: id,
    fieldName: "status",
    oldValue: before,
    newValue: status,
    changeReason: reason,
    changedBy: actorName,
    changedAt: master.updatedAt,
  });
  appendAudit("set_status", id, actorName, reason);
  return clone(master);
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
 * 신규(임시) 스타트업 마스터 생성. TEMP 코드·pending 검증·audit 기록.
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
  appendAudit("create_temporary", master.id, actorName, "Hub 직접 신규 등록");
  return clone(master);
}

export function mockListAudit(): AuditEntry[] {
  return [...store().audit].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
