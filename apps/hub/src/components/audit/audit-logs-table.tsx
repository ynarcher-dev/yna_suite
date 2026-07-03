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
import { auditActionLabel, ENTITY_LABEL, fmtDateTime } from "@/lib/hub-data/display";
import type { EntityType } from "@yna/core";
import type { AuditLogListItem } from "@/lib/hub-data/types";

/**
 * Hub 공통 감사 로그 조회. (근거: functional_spec §16, api_contracts §5, data_model §12)
 * 로그는 수정/삭제 불가(조회 전용)이며, before/after 는 민감 필드가 마스킹된 스냅샷이다(개인정보 원문 미저장).
 */
const ACTIONS = [
  "create_temporary",
  "update",
  "set_status",
  "add_identifier",
  "set_primary",
  "verify_identifier",
  "remove_identifier",
  "add_alias",
  "remove_alias",
  "view_sensitive",
  "merge",
  "reject_merge",
  "ignore_merge",
  "hold_merge",
];

function entityLabel(entityType: string): string {
  return ENTITY_LABEL[entityType as EntityType] ?? entityType;
}

/** before/after 스냅샷을 "key: value" 목록으로 표현. 값이 없으면 null 반환. */
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

export function AuditLogsTable({ entries }: { entries: AuditLogListItem[] }) {
  const [q, setQ] = useState("");
  const [entity, setEntity] = useState<string>("");
  const [action, setAction] = useState<string>("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return entries.filter((e) => {
      if (entity && e.entityType !== entity) return false;
      if (action && e.action !== action) return false;
      if (query) {
        const hay = `${e.actorName} ${e.reason ?? ""} ${e.entityLabel ?? ""} ${e.requestId}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [entries, q, entity, action]);

  return (
    <div className="flex flex-col gap-3">
      <FilterBar trailing={<span className="text-sm text-gray-500">{filtered.length}건</span>}>
        <Input
          placeholder="변경자·대상·사유·request_id 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-64"
          aria-label="감사 로그 검색"
        />
        <Select
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
          className="w-32"
          aria-label="엔티티 필터"
        >
          <option value="">엔티티 전체</option>
          <option value="startup">스타트업</option>
          <option value="expert">전문가</option>
          <option value="partner">협력사</option>
        </Select>
        <Select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="w-40"
          aria-label="작업 필터"
        >
          <option value="">작업 전체</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {auditActionLabel(a)}
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
              <TH>변경자</TH>
              <TH className="hidden md:table-cell">사유</TH>
              <TH className="hidden lg:table-cell">변경 내용</TH>
              <TH className="hidden xl:table-cell">request_id</TH>
            </TR>
          </THead>
          <TBody>
            {filtered.map((e) => (
              <TR key={e.id}>
                <TD className="whitespace-nowrap text-gray-600">{fmtDateTime(e.createdAt)}</TD>
                <TD className="whitespace-nowrap">{auditActionLabel(e.action)}</TD>
                <TD>
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-400">{entityLabel(e.entityType)}</span>
                    <span className="text-sm text-gray-800">{e.entityLabel ?? e.entityId ?? "—"}</span>
                  </div>
                </TD>
                <TD className="text-gray-600">{e.actorName}</TD>
                <TD className="hidden text-gray-600 md:table-cell">{e.reason ?? "—"}</TD>
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
