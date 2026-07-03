import { normalizeCompanyName } from "@yna/utils";
import {
  detectMergeWarnings,
  hasBlockingConflict,
  resolveMergeFields,
  type MergeFieldInput,
  type MergeFieldPolicy,
} from "@yna/master-data";
import { store, appendAudit, subTables, type MasterEntity } from "./mock-store";
import { comparableOf, listOf, type AnyMaster } from "./mock-temporary";
import { MERGE_FIELD_SPECS, applyFieldValue, fieldToString } from "./merge-fields";
import type { MergeCandidateRow } from "./mock-seed";
import type {
  MergeApproveInput,
  MergeApproveResult,
  MergeCandidateDetail,
  MergeCandidateFilter,
  MergeCandidateListItem,
  MergeEntityRef,
  MergeEntitySnapshot,
  MergeFieldResolutionRow,
  MergePreview,
  MergeSyncStatus,
} from "./types";

/**
 * 중복 후보 검토 · 수동 병합(mock seam). (근거: master_data_policy §10·13~15, api_contracts §12~15)
 *
 * 병합 승인은 정책 §10.3 혼합형을 따른다 — 1단계(동기)에서 source.status='merged' + merged_into_id 만
 * 확정하고, 2단계(비동기)에서 타 도메인 FK 를 백그라운드로 반영한다. 도메인 앱이 아직 없어(Phase 1)
 * affected_records 는 비어 있고 sync 는 즉시 완료로 처리한다(연결 시 resolved view/helper 로 실시간 resolve).
 * Docker/staging 연결 시 이 로직은 hub.approve_merge_candidate RPC 로 교체한다(이슈21).
 */

type LiveMaster = AnyMaster & Record<string, unknown>;

function masterOf(entityType: MasterEntity, id: string): LiveMaster | undefined {
  return listOf(entityType).find((x) => x.id === id) as LiveMaster | undefined;
}

function refOf(entityType: MasterEntity, id: string): MergeEntityRef | null {
  const m = masterOf(entityType, id);
  if (!m) return null;
  return {
    id: m.id,
    masterCode: m.masterCode,
    name: m.name,
    verificationStatus: m.verificationStatus,
    status: m.status,
  };
}

function relatedWorkOf(entityType: MasterEntity): { label: string; count: number }[] {
  if (entityType === "expert") {
    return [
      { label: "배정 평가", count: 0 },
      { label: "멘토링 세션", count: 0 },
    ];
  }
  if (entityType === "partner") {
    return [
      { label: "Project", count: 0 },
      { label: "Fund", count: 0 },
    ];
  }
  return [
    { label: "Work 신청", count: 0 },
    { label: "멘토링 세션", count: 0 },
  ];
}

function snapshotOf(entityType: MasterEntity, ref: MergeEntityRef): MergeEntitySnapshot {
  const master = masterOf(entityType, ref.id) as Record<string, unknown>;
  const sub = subTables(entityType, ref.id);
  return {
    ref,
    fields: MERGE_FIELD_SPECS[entityType].map((f) => ({
      key: f.key,
      label: f.label,
      value: fieldToString(master, f.key),
      sensitive: f.sensitive,
    })),
    identifiers: sub.identifiers,
    aliases: sub.aliases,
    relatedWork: relatedWorkOf(entityType),
  };
}

/** 필드 정책 override 를 반영해 field_resolution 을 만든다. */
function buildResolution(
  entityType: MasterEntity,
  sourceId: string,
  targetId: string,
  override?: Record<string, string>,
): MergeFieldResolutionRow[] {
  const source = masterOf(entityType, sourceId) as Record<string, unknown>;
  const target = masterOf(entityType, targetId) as Record<string, unknown>;
  const inputs: (MergeFieldInput & { label: string })[] = MERGE_FIELD_SPECS[entityType].map((f) => ({
    field: f.key,
    label: f.label,
    policy: (override?.[f.key] as MergeFieldPolicy) ?? f.policy,
    source: fieldToString(source, f.key),
    target: fieldToString(target, f.key),
  }));
  const labelByField = new Map(inputs.map((i) => [i.field, i.label]));
  return resolveMergeFields(inputs).map((r) => ({ ...r, label: labelByField.get(r.field) ?? r.field }));
}

function previewOf(
  entityType: MasterEntity,
  candidate: MergeCandidateRow,
  override?: Record<string, string>,
): MergePreview {
  const fieldResolution = buildResolution(entityType, candidate.sourceId, candidate.targetId, override);
  const warnings = detectMergeWarnings(
    comparableOf(entityType, candidate.sourceId),
    comparableOf(entityType, candidate.targetId),
  );
  // 도메인 앱 미연결(Phase 1) — FK 를 옮길 업무 레코드가 없어 affected 는 비어 있다(연결 시 계산).
  return {
    sourceEntityId: candidate.sourceId,
    targetEntityId: candidate.targetId,
    fieldResolution,
    affectedRecords: [],
    warnings,
    blocked: hasBlockingConflict(warnings),
  };
}

// ---- reads ----

function findCandidate(id: string): MergeCandidateRow | undefined {
  return store().mergeCandidates.find((c) => c.id === id);
}

export function mockListMergeCandidates(filter: MergeCandidateFilter): MergeCandidateListItem[] {
  const s = store();
  const items: MergeCandidateListItem[] = [];
  for (const c of s.mergeCandidates) {
    if (filter.entityType && filter.entityType !== "all" && c.entityType !== filter.entityType) continue;
    if (filter.status && filter.status !== "all" && c.status !== filter.status) continue;
    if (typeof filter.minScore === "number" && c.score < filter.minScore) continue;
    const source = refOf(c.entityType, c.sourceId);
    const target = refOf(c.entityType, c.targetId);
    if (!source || !target) continue;
    items.push({
      id: c.id,
      entityType: c.entityType,
      source,
      target,
      score: c.score,
      reasons: c.reasons,
      status: c.status as MergeCandidateListItem["status"],
      createdAt: c.createdAt,
    });
  }
  return items.sort((a, b) => {
    if (a.status !== b.status) return a.status === "pending" ? -1 : b.status === "pending" ? 1 : 0;
    return b.score - a.score;
  });
}

export function mockGetMergeCandidateDetail(id: string): MergeCandidateDetail | null {
  const c = findCandidate(id);
  if (!c) return null;
  const sourceRef = refOf(c.entityType, c.sourceId);
  const targetRef = refOf(c.entityType, c.targetId);
  if (!sourceRef || !targetRef) return null;
  return {
    id: c.id,
    entityType: c.entityType,
    score: c.score,
    reasons: c.reasons,
    status: c.status as MergeCandidateDetail["status"],
    createdAt: c.createdAt,
    source: snapshotOf(c.entityType, sourceRef),
    target: snapshotOf(c.entityType, targetRef),
    preview: previewOf(c.entityType, c),
  };
}

export function mockPreviewMerge(id: string, override?: Record<string, string>): MergePreview | null {
  const c = findCandidate(id);
  if (!c) return null;
  return previewOf(c.entityType, c, override);
}

// ---- write: approve (2단계 병합) ----

function pushMergeHistory(
  entityId: string,
  field: string,
  oldValue: string | null,
  newValue: string | null,
  reason: string,
  actor: string,
  at: string,
): void {
  const s = store();
  s.fieldHistory.push({
    id: `fh-${++s.idSeq}`,
    entityId,
    fieldName: field,
    oldValue,
    newValue,
    sourceDomain: "hub",
    changeReason: reason,
    changedBy: actor,
    changedAt: at,
  });
}

/** source 의 식별자/별칭을 target 으로 승계(중복 제외) + 밀려난 이름을 alias 로 보존. */
function preserveSourceRecords(source: LiveMaster, target: LiveMaster, at: string): void {
  const s = store();
  for (const idn of s.identifiers.filter((i) => i.entityId === source.id)) {
    const dup = s.identifiers.some(
      (i) => i.entityId === target.id && i.identifierType === idn.identifierType && i.normalizedValue === idn.normalizedValue,
    );
    if (dup) continue;
    s.identifiers.push({ ...idn, id: `id-${++s.idSeq}`, entityId: target.id, isPrimary: false });
  }
  for (const al of s.aliases.filter((a) => a.entityId === source.id)) {
    const dup = s.aliases.some(
      (a) => a.entityId === target.id && a.aliasType === al.aliasType && a.normalizedValue === al.normalizedValue,
    );
    if (dup) continue;
    s.aliases.push({ ...al, id: `al-${++s.idSeq}`, entityId: target.id });
  }
  if (source.name && source.name !== target.name) {
    const normalized = normalizeCompanyName(source.name);
    const exists = s.aliases.some((a) => a.entityId === target.id && a.normalizedValue === normalized);
    if (!exists) {
      s.aliases.push({
        id: `al-${++s.idSeq}`,
        entityId: target.id,
        aliasType: "previous_name",
        aliasValue: source.name,
        normalizedValue: normalized,
        sourceDomain: "hub",
        createdAt: at,
      });
    }
  }
}

/** field_resolution 을 target 에 적용(변경 필드마다 history 기록). */
function applyResolution(
  target: LiveMaster,
  resolution: MergeFieldResolutionRow[],
  reason: string,
  actor: string,
  at: string,
): void {
  for (const row of resolution) {
    const current = fieldToString(target, row.field);
    if ((current ?? null) === (row.selected ?? null)) continue;
    applyFieldValue(target, row.field, row.selected);
    if (row.field === "name" && row.selected) target.normalizedName = normalizeCompanyName(row.selected);
    pushMergeHistory(target.id, row.field, current, row.selected, reason, actor, at);
  }
}

export function mockApproveMerge(
  id: string,
  input: MergeApproveInput,
  actorName: string,
): MergeApproveResult {
  if (!input.reason.trim()) return { ok: false, error: "병합 사유를 입력하세요." };
  const c = findCandidate(id);
  if (!c) return { ok: false, error: "병합 후보를 찾을 수 없습니다." };
  if (c.status !== "pending" && c.status !== "on_hold") {
    return { ok: false, error: "검토 대기 중인 후보만 병합할 수 있습니다." };
  }
  const source = masterOf(c.entityType, c.sourceId);
  const target = masterOf(c.entityType, c.targetId);
  if (!source || !target) return { ok: false, error: "대상 마스터를 찾을 수 없습니다." };
  if (source.status === "merged" || target.status === "merged") {
    return { ok: false, error: "이미 병합된 마스터가 포함되어 있습니다." };
  }

  const preview = previewOf(c.entityType, c, input.fieldPolicy);
  if (preview.blocked) {
    return { ok: false, error: "강한 식별자 충돌이 있어 병합할 수 없습니다." };
  }

  const s = store();
  const at = new Date().toISOString();
  const reason = input.reason.trim();

  // 대표값 승계 + 밀려난 값 보존(정책 §14).
  applyResolution(target, preview.fieldResolution, reason, actorName, at);
  preserveSourceRecords(source, target, at);

  // 1단계(동기): source 상태만 빠르게 확정.
  source.status = "merged";
  source.mergedIntoId = target.id;
  source.updatedAt = at;
  target.updatedAt = at;

  // 2단계(비동기): 타 도메인 FK 반영. Phase 1 은 대상 0건이라 즉시 완료.
  const affectedCount = preview.affectedRecords.length;
  const syncStatus: MergeSyncStatus = affectedCount === 0 ? "completed" : "pending";
  const eventId = `me-${++s.mergeSeq}`;
  s.mergeEvents.unshift({
    id: eventId,
    entityType: c.entityType,
    sourceId: source.id,
    sourceName: source.name,
    targetId: target.id,
    targetName: target.name,
    syncStatus,
    reason,
    affectedCount,
    createdAt: at,
  });

  c.status = "approved";
  appendAudit(c.entityType, "merge", target.id, actorName, reason);
  appendAudit(c.entityType, "merge", source.id, actorName, `${target.masterCode} 로 병합`);

  return { ok: true, targetId: target.id, eventId, syncStatus };
}

// ---- write: reject / ignore / hold ----

function setCandidateStatus(
  id: string,
  status: "rejected" | "ignored" | "on_hold" | "pending",
  action: string,
  actorName: string,
  reason: string,
): MergeApproveResult {
  if (!reason.trim()) return { ok: false, error: "사유를 입력하세요." };
  const c = findCandidate(id);
  if (!c) return { ok: false, error: "병합 후보를 찾을 수 없습니다." };
  if (c.status === "approved") return { ok: false, error: "이미 병합된 후보입니다." };
  c.status = status;
  appendAudit(c.entityType, action, c.targetId, actorName, reason.trim());
  return { ok: true, targetId: c.targetId };
}

export function mockRejectMerge(id: string, reason: string, actorName: string): MergeApproveResult {
  return setCandidateStatus(id, "rejected", "reject_merge", actorName, reason);
}

export function mockIgnoreMerge(id: string, reason: string, actorName: string): MergeApproveResult {
  return setCandidateStatus(id, "ignored", "ignore_merge", actorName, reason);
}

export function mockHoldMerge(id: string, reason: string, actorName: string): MergeApproveResult {
  return setCandidateStatus(id, "on_hold", "hold_merge", actorName, reason);
}
