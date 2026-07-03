"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  ConfirmDialog,
  FormField,
  Input,
  Select,
  StatusBadge,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Textarea,
} from "@yna/ui";
import { dryRunImportAction, runImportAction } from "@/lib/hub-data/actions-import";
import { usePermissions } from "@/lib/auth/permission-context";
import { importDecisionMeta } from "@/lib/hub-data/display";
import { parseImportCsv } from "@/lib/hub-data/import-csv";
import { ImportSummaryCards } from "./import-summary-cards";
import type { ImportDryRunReport, ImportSourceType } from "@/lib/hub-data/types";

/**
 * 기존 스타트업 DB 이관 실행 패널. (근거: migration_strategy §16 — dry-run 필수 후 실제 이관)
 * CSV(첫 줄 헤더) 붙여넣기 → dry-run 미리보기(운영 미반영) → 검증 후 실제 이관 실행.
 * 매핑 안 되는 컬럼은 서버에서 raw_payload 로 보존한다(§7).
 */
export function ImportRunPanel() {
  const router = useRouter();
  const { canWriteCurrent } = usePermissions();
  const [pending, startTransition] = useTransition();
  const [sourceName, setSourceName] = useState("");
  const [sourceType, setSourceType] = useState<ImportSourceType>("csv");
  const [text, setText] = useState("");
  const [report, setReport] = useState<ImportDryRunReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  function rowsOrError() {
    try {
      const rows = parseImportCsv(text);
      if (!rows.length) {
        setError("헤더 아래에 이관할 데이터 행을 입력하세요.");
        return null;
      }
      return rows;
    } catch (e) {
      setError(e instanceof Error ? e.message : "CSV 파싱에 실패했습니다.");
      return null;
    }
  }

  function preview() {
    setError(null);
    setReport(null);
    const rows = rowsOrError();
    if (!rows) return;
    startTransition(async () => {
      const res = await dryRunImportAction({
        sourceType,
        sourceName: sourceName.trim() || "manual",
        rows,
      });
      if (!res) {
        setError("dry-run 을 실행할 수 없습니다(권한 또는 데이터 확인).");
        return;
      }
      setReport(res);
    });
  }

  function run() {
    const rows = rowsOrError();
    if (!rows) {
      setConfirmOpen(false);
      return;
    }
    startTransition(async () => {
      const res = await runImportAction({
        sourceType,
        sourceName: sourceName.trim() || "manual",
        rows,
      });
      setConfirmOpen(false);
      if (!res.ok) {
        setError(res.error ?? "이관에 실패했습니다.");
        return;
      }
      setText("");
      setReport(null);
      router.refresh();
    });
  }

  if (!canWriteCurrent) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-25 p-4 text-sm text-gray-500">
        데이터 이관 실행에는 Hub 쓰기 권한이 필요합니다. 기존 batch 조회만 가능합니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="원본 이름" htmlFor="import-source-name">
          <Input
            id="import-source-name"
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            placeholder="예: 2025_스타트업DB.xlsx"
          />
        </FormField>
        <FormField label="원본 유형" htmlFor="import-source-type">
          <Select
            id="import-source-type"
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value as ImportSourceType)}
          >
            <option value="csv">CSV</option>
            <option value="xlsx">엑셀</option>
            <option value="db">기존 DB</option>
            <option value="google_sheet">구글시트</option>
            <option value="manual">수동 입력</option>
          </Select>
        </FormField>
      </div>

      <FormField
        label="원본 데이터(CSV · 첫 줄 헤더)"
        htmlFor="import-csv"
        error={error ?? undefined}
      >
        <Textarea
          id="import-csv"
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"회사명,대표자,사업자번호,연락처\n알파테크,홍길동,,010-1234-5678\n제타모빌리티,장민수,,"}
          className="font-mono text-xs"
        />
      </FormField>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={preview} disabled={pending}>
          dry-run 미리보기
        </Button>
        <Button onClick={() => setConfirmOpen(true)} disabled={pending || !report}>
          실제 이관 실행
        </Button>
      </div>

      {report && (
        <div className="flex flex-col gap-3 border-t border-gray-100 pt-3">
          <p className="text-sm text-gray-600">
            dry-run 결과 — 전체 {report.totalRows}건 (운영에 아직 반영되지 않았습니다).
          </p>
          <ImportSummaryCards summary={report.summary} />
          <Table>
            <THead>
              <TR>
                <TH>행</TH>
                <TH>표시명</TH>
                <TH>판정</TH>
                <TH className="hidden sm:table-cell">대상/사유</TH>
                <TH>점수</TH>
              </TR>
            </THead>
            <TBody>
              {report.rows.map((r, idx) => {
                const meta = importDecisionMeta(r.decisionKind);
                return (
                  <TR key={idx}>
                    <TD className="tabular-nums text-gray-500">{r.sourceRowNumber ?? idx + 1}</TD>
                    <TD className="text-gray-800">{r.displayName}</TD>
                    <TD>
                      <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                    </TD>
                    <TD className="hidden text-xs text-gray-500 sm:table-cell">
                      {r.errorMessage ?? r.targetLabel ?? "—"}
                    </TD>
                    <TD className="tabular-nums text-gray-600">{r.score || "—"}</TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="실제 이관 실행"
        description="dry-run 결과대로 Hub 마스터를 생성/연결하고 중복 후보를 큐잉합니다. 되돌리려면 batch rollback 을 사용하세요."
        confirmLabel="이관 실행"
        tone="primary"
        busy={pending}
        onConfirm={run}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
