"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  EmptyState,
  FilterBar,
  Select,
  StatusBadge,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@yna/ui";
import { fmtDateTime, importBatchStatusMeta, importSourceLabel } from "@/lib/hub-data/display";
import type { ImportBatch, ImportBatchStatus } from "@/lib/hub-data/types";

/**
 * Import Batch 목록. (근거: functional_spec §14 — source_name·entity_type·row 수·status·시각)
 * 상태 필터 + 행 클릭 시 상세(성공/실패 요약·재처리 기준). 데이터는 서버에서 조회한다.
 */
export function ImportBatchesTable({ batches }: { batches: ImportBatch[] }) {
  const router = useRouter();
  const [status, setStatus] = useState<ImportBatchStatus | "">("");

  const filtered = useMemo(
    () => batches.filter((b) => !status || b.status === status),
    [batches, status],
  );

  return (
    <div className="flex flex-col gap-3">
      <FilterBar trailing={<span className="text-sm text-gray-500">{filtered.length}건</span>}>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as ImportBatchStatus | "")}
          className="w-36"
          aria-label="상태 필터"
        >
          <option value="">상태 전체</option>
          <option value="completed">완료</option>
          <option value="partial">부분성공</option>
          <option value="failed">실패</option>
          <option value="archived">되돌림</option>
        </Select>
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState
          title="import batch 가 없습니다"
          description="아래 이관 실행 패널에서 dry-run 으로 검증한 뒤 실제 이관을 실행하면 batch 가 생성됩니다."
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>원본</TH>
              <TH className="hidden sm:table-cell">유형</TH>
              <TH>전체</TH>
              <TH>처리</TH>
              <TH>실패</TH>
              <TH>상태</TH>
              <TH className="hidden md:table-cell">시작</TH>
            </TR>
          </THead>
          <TBody>
            {filtered.map((b) => {
              const st = importBatchStatusMeta(b.status);
              return (
                <TR key={b.id} interactive onClick={() => router.push(`/import-batches/${b.id}`)}>
                  <TD>
                    <span className="text-sm text-gray-800">{b.sourceName}</span>
                  </TD>
                  <TD className="hidden text-gray-600 sm:table-cell">{importSourceLabel(b.sourceType)}</TD>
                  <TD className="tabular-nums text-gray-700">{b.totalRows}</TD>
                  <TD className="tabular-nums text-gray-700">{b.processedRows}</TD>
                  <TD className="tabular-nums text-gray-700">{b.failedRows}</TD>
                  <TD>
                    <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
                  </TD>
                  <TD className="hidden text-gray-600 md:table-cell">{fmtDateTime(b.startedAt)}</TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}
    </div>
  );
}
