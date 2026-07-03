"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  MasterCodeBadge,
  StatusBadge,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@yna/ui";
import { rollbackImportAction } from "@/lib/hub-data/actions-import";
import {
  fmtDateTime,
  importBatchStatusMeta,
  importDecisionMeta,
  importRowStatusMeta,
  importSourceLabel,
} from "@/lib/hub-data/display";
import { ImportSummaryCards } from "./import-summary-cards";
import type { ImportBatchDetail } from "@/lib/hub-data/types";

/**
 * Import Batch 상세. (근거: functional_spec §14 — 성공/실패 요약·신규/연결/후보 수·실패 사유·재처리 기준)
 * batch 단위 rollback(status='archived' 비활성화, migration_strategy §15)을 제공한다.
 */
export function ImportBatchDetailView({ detail }: { detail: ImportBatchDetail }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { batch, rows, failureReasons } = detail;
  const st = importBatchStatusMeta(batch.status);
  const canRollback = !batch.isDryRun && batch.status !== "archived";

  function rollback() {
    setError(null);
    startTransition(async () => {
      const res = await rollbackImportAction(batch.id);
      setConfirmOpen(false);
      if (!res.ok) {
        setError(res.error ?? "rollback 에 실패했습니다.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-800">{batch.sourceName}</span>
            <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
          </div>
          {canRollback && (
            <Button variant="danger" onClick={() => setConfirmOpen(true)} disabled={pending}>
              batch 되돌리기
            </Button>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
          <Meta label="원본 유형" value={importSourceLabel(batch.sourceType)} />
          <Meta label="전체/처리/실패" value={`${batch.totalRows} / ${batch.processedRows} / ${batch.failedRows}`} />
          <Meta label="실행자" value={batch.startedBy ?? "—"} />
          <Meta label="시작" value={fmtDateTime(batch.startedAt)} />
          <Meta label="종료" value={fmtDateTime(batch.finishedAt)} />
          {batch.archivedAt && <Meta label="되돌림" value={fmtDateTime(batch.archivedAt)} />}
        </dl>
        {error && <p className="text-sm text-brand">{error}</p>}
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-gray-700">검증 리포트</h2>
        <ImportSummaryCards summary={batch.summary} />
      </section>

      {failureReasons.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-gray-700">실패 사유 (재처리 기준)</h2>
          <ul className="flex flex-col gap-1 rounded-md border border-gray-200 bg-white p-3 text-sm">
            {failureReasons.map((f) => (
              <li key={f.message} className="flex items-center justify-between gap-3">
                <span className="text-gray-700">{f.message}</span>
                <span className="tabular-nums text-gray-500">{f.count}건</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-gray-700">Import Row ({rows.length})</h2>
        {rows.length === 0 ? (
          <EmptyState title="row 가 없습니다" description="이 batch 에 적재된 row 가 없습니다." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>행</TH>
                <TH>표시명</TH>
                <TH>판정</TH>
                <TH>처리</TH>
                <TH className="hidden md:table-cell">대상/사유</TH>
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => {
                const dm = r.decisionKind ? importDecisionMeta(r.decisionKind) : null;
                const rs = importRowStatusMeta(r.importStatus);
                const name = (r.mappedPayload?.name ?? r.mappedPayload?.team_name) as string | undefined;
                return (
                  <TR key={r.id}>
                    <TD className="tabular-nums text-gray-500">{r.sourceRowNumber ?? "—"}</TD>
                    <TD className="text-gray-800">
                      {name ?? String((r.rawPayload["회사명"] as string) ?? "(이름 없음)")}
                    </TD>
                    <TD>{dm ? <StatusBadge tone={dm.tone}>{dm.label}</StatusBadge> : "—"}</TD>
                    <TD>
                      <StatusBadge tone={rs.tone}>{rs.label}</StatusBadge>
                    </TD>
                    <TD className="hidden text-xs text-gray-500 md:table-cell">
                      {r.errorMessage ? (
                        r.errorMessage
                      ) : r.hubEntityId ? (
                        <span className="flex items-center gap-1">
                          <MasterCodeBadge code={(r.hubEntityLabel ?? r.hubEntityId).split(" · ")[0] ?? ""} />
                          {(r.hubEntityLabel ?? "").split(" · ")[1] ?? ""}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </section>

      <ConfirmDialog
        open={confirmOpen}
        title="batch 되돌리기"
        description="이 batch 가 새로 만든 임시 마스터를 보관(archived) 처리하고 얽힌 중복 후보를 만료합니다. 연결한 기존 마스터는 유지됩니다. 이 작업은 감사 로그에 남습니다."
        confirmLabel="되돌리기"
        tone="danger"
        busy={pending}
        onConfirm={rollback}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-gray-800">{value}</dd>
    </div>
  );
}
