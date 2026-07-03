import Link from "next/link";
import { Button, EmptyState, MasterCodeBadge, StatusBadge, Table, TBody, TD, TH, THead, TR } from "@yna/ui";
import { maskBusinessNumber, maskEmail, maskPhone } from "@yna/utils";
import { candidateStrength } from "@yna/master-data";
import {
  aliasLabel,
  auditActionLabel,
  fmtDateTime,
  identifierLabel,
} from "@/lib/hub-data/display";
import type {
  AuditEntry,
  FieldHistoryEntry,
  MasterAlias,
  MasterIdentifier,
  MergeCandidateSummary,
} from "@/lib/hub-data/types";

/** 섹션 공통 헤더(제목 + 우측 액션). */
function SectionHead({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-md font-semibold text-gray-900">{title}</h2>
      {action}
    </div>
  );
}

function maskIdentifier(type: string, value: string): string {
  if (type === "business_number" || type === "corporation_number") return maskBusinessNumber(value);
  if (type === "founder_phone") return maskPhone(value);
  if (type === "founder_email") return maskEmail(value);
  return value;
}

export function IdentifiersSection({
  identifiers,
  canWrite,
  onAdd,
}: {
  identifiers: MasterIdentifier[];
  canWrite: boolean;
  onAdd: () => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <SectionHead
        title="식별자"
        action={
          canWrite ? (
            <Button variant="outline" size="sm" onClick={onAdd}>
              식별자 추가
            </Button>
          ) : undefined
        }
      />
      {identifiers.length === 0 ? (
        <p className="text-sm text-gray-500">등록된 식별자가 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {identifiers.map((i) => (
            <li key={i.id} className="flex items-center gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm">
              <span className="w-28 shrink-0 text-gray-500">{identifierLabel(i.identifierType)}</span>
              <span className="font-medium text-gray-800">{maskIdentifier(i.identifierType, i.identifierValue)}</span>
              {i.isPrimary && <StatusBadge tone="info">대표</StatusBadge>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function AliasesSection({
  aliases,
  canWrite,
  onAdd,
}: {
  aliases: MasterAlias[];
  canWrite: boolean;
  onAdd: () => void;
}) {
  return (
    <section className="flex flex-col gap-3">
      <SectionHead
        title="별칭"
        action={
          canWrite ? (
            <Button variant="outline" size="sm" onClick={onAdd}>
              별칭 추가
            </Button>
          ) : undefined
        }
      />
      {aliases.length === 0 ? (
        <p className="text-sm text-gray-500">등록된 별칭이 없습니다.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {aliases.map((a) => (
            <li key={a.id} className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-sm">
              <span className="text-xs text-gray-400">{aliasLabel(a.aliasType)}</span>
              <span className="text-gray-800">{a.aliasValue}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function MergeCandidatesSection({ candidates }: { candidates: MergeCandidateSummary[] }) {
  return (
    <section className="flex flex-col gap-3">
      <SectionHead title="중복 후보" />
      {candidates.length === 0 ? (
        <p className="text-sm text-gray-500">연결된 중복 후보가 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {candidates.map((c) => {
            const strong = candidateStrength(c.score);
            return (
              <li key={c.id}>
                <Link
                  href={`/startups/${c.otherId}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 hover:border-gray-300"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <MasterCodeBadge code={c.otherMasterCode} />
                      <span className="truncate text-sm font-medium text-gray-800">{c.otherName}</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">{c.reasons.join(", ")}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge tone={strong === "strong" ? "danger" : strong === "medium" ? "warning" : "neutral"}>
                      {c.status}
                    </StatusBadge>
                    <span className="w-8 text-right text-xs tabular-nums text-gray-500">{Math.round(c.score)}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function FieldHistorySection({ history }: { history: FieldHistoryEntry[] }) {
  return (
    <section className="flex flex-col gap-3">
      <SectionHead title="필드 변경 이력" />
      {history.length === 0 ? (
        <p className="text-sm text-gray-500">변경 이력이 없습니다.</p>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>시각</TH>
              <TH>필드</TH>
              <TH>이전</TH>
              <TH>이후</TH>
              <TH>사유</TH>
            </TR>
          </THead>
          <TBody>
            {history.map((h) => (
              <TR key={h.id}>
                <TD className="whitespace-nowrap text-gray-600">{fmtDateTime(h.changedAt)}</TD>
                <TD className="text-gray-800">{h.fieldName}</TD>
                <TD className="text-gray-500">{h.oldValue ?? "—"}</TD>
                <TD className="text-gray-800">{h.newValue ?? "—"}</TD>
                <TD className="text-gray-500">{h.changeReason ?? "—"}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </section>
  );
}

export function AuditSummarySection({ audit }: { audit: AuditEntry[] }) {
  return (
    <section className="flex flex-col gap-3">
      <SectionHead title="감사 로그 요약" />
      {audit.length === 0 ? (
        <p className="text-sm text-gray-500">기록된 감사 로그가 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {audit.map((a) => (
            <li key={a.id} className="flex items-center gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm">
              <span className="w-32 shrink-0 whitespace-nowrap text-xs text-gray-400">{fmtDateTime(a.createdAt)}</span>
              <span className="font-medium text-gray-800">{auditActionLabel(a.action)}</span>
              <span className="text-gray-500">{a.actorName}</span>
              {a.reason && <span className="truncate text-gray-500">· {a.reason}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function RelatedWorkSection({ related }: { related: { label: string; count: number }[] }) {
  return (
    <section className="flex flex-col gap-3">
      <SectionHead title="관련 업무 이력 요약" />
      {related.every((r) => r.count === 0) ? (
        <EmptyState
          title="연결된 업무 이력 없음"
          description="Work/Fund 등 도메인 앱 연결 후 신청·평가·멘토링 요약이 표시됩니다."
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {related.map((r) => (
            <div key={r.label} className="rounded-lg border border-gray-200 bg-white p-3">
              <p className="text-xs text-gray-500">{r.label}</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">{r.count}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
