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
import { actionLabel, fmtDateTime } from "@/lib/dev-data/display";
import type { PermissionAuditEntry } from "@/lib/dev-data/types";

const ACTIONS = ["update", "apply_template", "invite", "invite_external", "link_external", "set_status"];

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
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  );
}
