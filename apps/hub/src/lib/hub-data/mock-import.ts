import {
  appendAuditFor,
  clone,
  findMasterRef,
  newAuditRequestId,
  store,
} from "./mock-store";
import { comparableOf, listOf } from "./mock-temporary";
import { mockCreateTemporaryMaster } from "./mock-temporary";
import {
  planRows,
  summarizePlans,
  type ExistingComparable,
  type PlannedRow,
} from "./import-plan";
import type {
  ImportBatch,
  ImportBatchDetail,
  ImportDryRunReport,
  ImportRow,
  ImportRunInput,
  ImportRunResult,
  ImportSummary,
  TemporaryMasterInput,
} from "./types";

/**
 * 기존 스타트업 DB 이관 도구(mock seam). (근거: yna_suite_migration_strategy.md, functional_spec §14)
 *
 * dry-run(운영 미반영 검증) / run(실제 이관) / rollback(batch 단위 비활성화)을 담당한다.
 * 판정은 순수 planRows 로 하고, 실제 마스터 생성/후보 큐잉은 임시 마스터 생성 경로(mock-temporary)를
 * 재사용한다(migration_strategy §17 — 정규화/식별자/후보 점수는 공통 함수 사용).
 * Docker/staging 연결 시 이 로직은 staging 적재 + hub RPC(create_temporary_master 등)로 교체한다(이슈21).
 */

/** 이관 대상(스타트업)의 현재 활성 마스터 비교필드 목록. */
function activeStartupComparables(): ExistingComparable[] {
  return listOf("startup")
    .filter((m) => m.status === "active")
    .map((m) => ({ id: m.id, comparable: comparableOf("startup", m.id) }));
}

/** 마스터 표시 라벨(masterCode · 이름). */
function labelOf(id: string): string | null {
  const m = findMasterRef("startup", id);
  return m ? `${m.masterCode} · ${m.name}` : id;
}

/** 매핑값에서 임시 마스터 생성 입력을 만든다. 파생 식별자는 생성 경로가 처리한다. */
function toTemporaryInput(
  mapped: Record<string, string>,
  batchId: string,
  rowNumber: number | null,
): TemporaryMasterInput {
  const identifiers = mapped.corporation_number
    ? [{ identifierType: "corporation_number", identifierValue: mapped.corporation_number }]
    : undefined;
  const aliases =
    mapped.team_name && mapped.name && mapped.team_name !== mapped.name
      ? [{ aliasType: "team_name", aliasValue: mapped.team_name }]
      : undefined;
  return {
    name: mapped.name ?? mapped.team_name ?? "",
    legalName: mapped.legal_name ?? null,
    representativeName: mapped.representative_name ?? null,
    businessNumber: mapped.business_number ?? null,
    phone: mapped.phone ?? null,
    email: mapped.email ?? null,
    websiteUrl: mapped.website_url ?? null,
    sourceDomain: "import",
    sourceRecordId: `${batchId}#${rowNumber ?? "?"}`,
    identifiers,
    aliases,
  };
}

/** import batch 목록(최신순). */
export function mockListImportBatches(): ImportBatch[] {
  return [...store().importBatches]
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1))
    .map(clone);
}

function aggregateFailures(rows: ImportRow[]): { message: string; count: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    if (r.importStatus === "failed" && r.errorMessage) {
      map.set(r.errorMessage, (map.get(r.errorMessage) ?? 0) + 1);
    }
  }
  return [...map.entries()]
    .map(([message, count]) => ({ message, count }))
    .sort((a, b) => b.count - a.count);
}

/** import batch 상세(요약 + row + 실패 사유). hub 마스터 라벨은 조회 시 재해석. */
export function mockGetImportBatchDetail(id: string): ImportBatchDetail | null {
  const s = store();
  const batch = s.importBatches.find((b) => b.id === id);
  if (!batch) return null;
  const rows: ImportRow[] = s.importRows
    .filter((r) => r.batchId === id)
    .sort((a, b) => (a.sourceRowNumber ?? 0) - (b.sourceRowNumber ?? 0))
    .map(({ batchId: _drop, ...rest }) => {
      void _drop;
      return { ...clone(rest), hubEntityLabel: rest.hubEntityId ? labelOf(rest.hubEntityId) : rest.hubEntityLabel };
    });
  return { batch: clone(batch), rows, failureReasons: aggregateFailures(rows) };
}

/** dry-run: 운영에 반영하지 않고 판정 결과·검증 리포트만 계산한다(migration_strategy §16). */
export function mockDryRunImport(input: ImportRunInput): ImportDryRunReport {
  const plans = planRows(input.rows, activeStartupComparables());
  return {
    totalRows: input.rows.length,
    summary: summarizePlans(plans),
    rows: plans.map((p) => ({
      sourceRowNumber: p.sourceRowNumber,
      displayName: p.displayName,
      decisionKind: p.decisionKind,
      targetLabel: p.targetId ? labelOf(p.targetId) : null,
      score: p.score,
      errorMessage: p.errorMessage,
    })),
  };
}

/** 처리 결과 누적(마스터 생성/연결). row 레코드도 함께 만든다. */
function commitRow(
  plan: PlannedRow,
  batchId: string,
  actorName: string,
  now: string,
  summary: ImportSummary,
): ImportRow & { batchId: string } {
  const s = store();
  const rowId = `ir-${++s.idSeq}`;
  let hubEntityId: string | null = null;
  let hubEntityLabel: string | null = null;
  let decisionKind = plan.decisionKind;

  if (plan.status === "failed") {
    summary.failedRows += 1;
  } else if (plan.decisionKind === "connect" && plan.targetId) {
    hubEntityId = plan.targetId;
    hubEntityLabel = labelOf(plan.targetId);
    summary.linkedMasters += 1;
  } else {
    const res = mockCreateTemporaryMaster(
      "startup",
      toTemporaryInput(plan.mapped, batchId, plan.sourceRowNumber),
      actorName,
    );
    hubEntityId = res.id;
    hubEntityLabel = labelOf(res.id);
    summary.mergeCandidates += res.mergeCandidateCount;
    if (res.mergeCandidateCount > 0) {
      decisionKind = "candidate";
      summary.candidateMasters += 1;
    } else {
      decisionKind = "new_master";
      summary.newMasters += 1;
    }
  }

  return {
    id: rowId,
    batchId,
    sourceRowNumber: plan.sourceRowNumber,
    rawPayload: plan.raw,
    mappedPayload: plan.mapped,
    normalizedPayload: plan.normalized,
    importStatus: plan.status,
    decisionKind,
    errorMessage: plan.errorMessage,
    hubEntityId,
    hubEntityLabel,
    createdAt: now,
    processedAt: plan.status === "failed" ? null : new Date().toISOString(),
  };
}

/** 실제 이관: batch·row 생성, 마스터 생성/연결, 중복 후보 자동 큐잉, batch 감사 기록. */
export function mockRunImport(input: ImportRunInput, actorName: string): ImportRunResult {
  const s = store();
  const requestId = newAuditRequestId();
  const batchId = `ib-${++s.importSeq}`;
  const now = new Date().toISOString();

  const plans = planRows(input.rows, activeStartupComparables());
  const summary: ImportSummary = {
    newMasters: 0,
    linkedMasters: 0,
    candidateMasters: 0,
    mergeCandidates: 0,
    failedRows: 0,
    needsReview: 0,
  };
  const rows = plans.map((p) => commitRow(p, batchId, actorName, now, summary));
  summary.needsReview = summary.candidateMasters;

  const processed = rows.filter((r) => r.importStatus !== "failed").length;
  const status =
    summary.failedRows === 0 ? "completed" : processed === 0 ? "failed" : "partial";
  const batch: ImportBatch = {
    id: batchId,
    sourceType: input.sourceType,
    sourceName: input.sourceName,
    entityType: "startup",
    isDryRun: false,
    status,
    totalRows: input.rows.length,
    processedRows: processed,
    failedRows: summary.failedRows,
    summary,
    startedBy: actorName,
    startedAt: now,
    finishedAt: new Date().toISOString(),
    archivedAt: null,
  };
  s.importBatches.push(batch);
  s.importRows.push(...rows);
  appendAuditFor("import_batch", "import", batchId, actorName, `${input.sourceName} 이관(${input.sourceType})`, {
    requestId,
    after: { ...summary, status },
  });
  return { ok: true, batchId, status, summary };
}

/**
 * batch 단위 rollback(migration_strategy §15). 물리 삭제 대신 이 batch 가 새로 만든 마스터를
 * status='archived' 로 비활성화하고 얽힌 pending 후보를 만료 처리한다(연결한 기존 마스터는 보존).
 */
export function mockRollbackImport(id: string, actorName: string): ImportRunResult {
  const s = store();
  const batch = s.importBatches.find((b) => b.id === id);
  if (!batch) return { ok: false, error: "import batch 를 찾을 수 없습니다." };
  if (batch.isDryRun) return { ok: false, error: "dry-run 은 되돌릴 대상이 없습니다." };
  if (batch.status === "archived") return { ok: false, error: "이미 되돌린(archived) batch 입니다." };

  const requestId = newAuditRequestId();
  let archivedMasters = 0;
  let expiredCandidates = 0;
  for (const r of s.importRows.filter((row) => row.batchId === id)) {
    if (r.hubEntityId && (r.decisionKind === "new_master" || r.decisionKind === "candidate")) {
      const master = findMasterRef("startup", r.hubEntityId);
      if (master && master.status === "active") {
        master.status = "archived";
        archivedMasters += 1;
        for (const c of s.mergeCandidates) {
          if (c.status === "pending" && (c.sourceId === r.hubEntityId || c.targetId === r.hubEntityId)) {
            c.status = "expired";
            expiredCandidates += 1;
          }
        }
      }
    }
    r.importStatus = "skipped";
  }
  batch.status = "archived";
  batch.archivedAt = new Date().toISOString();
  appendAuditFor("import_batch", "import_rollback", id, actorName, `${batch.sourceName} 이관 rollback`, {
    requestId,
    before: { status: "completed" },
    after: { status: "archived", archivedMasters, expiredCandidates },
  });
  return { ok: true, batchId: id, status: "archived", summary: batch.summary };
}
