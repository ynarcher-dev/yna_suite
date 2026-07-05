"use client";

import { useMemo, useState } from "react";
import {
  EmptyState,
  FilterBar,
  Input,
  Select,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@yna/ui";
import { actionLabel, fmtDateTime } from "@/lib/admin-data/display";
import type { PermissionAuditEntry } from "@/lib/admin-data/types";

const ACTIONS = ["update", "apply_template", "invite", "invite_external", "link_external", "set_status"];

/** before/after 스냅샷을 "key: value" 문자열로. 값이 없으면 null. */
function snapshotLines(snapshot: unknown): string[] | null {
  if (snapshot == null || typeof snapshot !== "object") return null;
  const entries = Object.entries(snapshot as Record<string, unknown>);
  if (entries.length === 0) return null;
  return entries.map(([k, v]) => `${k}: ${v === null || v === undefined ? "—" : String(v)}`);
}

function ChangeDetail({ before, after }: { before: unknown; after: unknown }) {
  const b = snapshotLines(before);
  const a = snapshotLines(after);
  if (!b && !a) return <span className="text-gray-400">—</span>;
  return (
    <details className="text-xs">
      <summary className="cursor-pointer select-none text-gray-500 hover:text-gray-800">변경 보기</summary>
      <div className="mt-1 flex flex-col gap-1 rounded-md bg-gray-25 p-2">
        <div>
          <span className="text-gray-400">전: </span>
          <span className="text-gray-700">{b ? b.join(", ") : "—"}</span>
        </div>
        <div>
          <span className="text-gray-400">후: </span>
          <span className="text-gray-800">{a ? a.join(", ") : "—"}</span>
        </div>
      </div>
    </details>
  );
}

/**
 * 권한 감사 로그 조회. (근거: functional_spec §16, api_contracts §5·§17)
 * 로그는 수정/삭제 불가이며 개인정보 원문은 저장하지 않는다(before/after 는 권한 스냅샷).
 */
export function AuditLogsTable({ entries }: { entries: PermissionAuditEntry[] }) {
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return entries.filter((e) => {
      if (action && e.action !== action) return false;
      if (query && !`${e.targetName} ${e.actorName}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [entries, q, action]);

  return (
    <div className="flex flex-col gap-3">
      <FilterBar trailing={<span className="text-sm text-gray-500">{filtered.length}건</span>}>
        <Input
          placeholder="대상·변경자 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-56"
          aria-label="감사 로그 검색"
        />
        <Select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="w-44"
          aria-label="작업 필터"
        >
          <option value="">작업 전체</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {actionLabel(a)}
            </option>
          ))}
        </Select>
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState title="감사 로그가 없습니다" description="조건을 바꿔 다시 조회하세요." />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>시각</TH>
              <TH>작업</TH>
              <TH>대상</TH>
              <TH>도메인</TH>
              <TH>변경자</TH>
              <TH>사유</TH>
              <TH className="hidden lg:table-cell">변경 내용</TH>
              <TH className="hidden xl:table-cell">request_id</TH>
            </TR>
          </THead>
          <TBody>
            {filtered.map((e) => (
              <TR key={e.id}>
                <TD className="whitespace-nowrap text-gray-600">{fmtDateTime(e.createdAt)}</TD>
                <TD>{actionLabel(e.action)}</TD>
                <TD className="font-medium text-gray-900">{e.targetName}</TD>
                <TD className="text-gray-600">{e.domain ?? "—"}</TD>
                <TD className="text-gray-600">{e.actorName}</TD>
                <TD className="text-gray-600">{e.reason ?? "—"}</TD>
                <TD className="hidden lg:table-cell">
                  <ChangeDetail before={e.before} after={e.after} />
                </TD>
                <TD className="hidden xl:table-cell">
                  <code className="text-xs text-gray-400">{e.requestId}</code>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
