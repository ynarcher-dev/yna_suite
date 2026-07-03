"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, MasterCodeBadge, PageHeader, StatusBadge } from "@yna/ui";
import { usePermissions } from "@/lib/auth/permission-context";
import { addAlias, addIdentifier } from "@/lib/hub-data/actions";
import {
  ALIAS_TYPES,
  IDENTIFIER_TYPES,
  aliasLabel,
  fmtDateTime,
  identifierLabel,
  masterStatusMeta,
  verificationMeta,
} from "@/lib/hub-data/display";
import type { StartupDetail } from "@/lib/hub-data/types";
import {
  AliasesSection,
  AuditSummarySection,
  FieldHistorySection,
  IdentifiersSection,
  MergeCandidatesSection,
  RelatedWorkSection,
} from "./detail-sections";
import { EditStartupDialog } from "./edit-startup-dialog";
import { MasterAddDialog } from "./master-add-dialog";
import { StatusChangeDialog } from "./status-change-dialog";

/**
 * 스타트업 마스터 상세. (근거: functional_spec §7)
 * 기본정보·식별자·별칭·필드 이력·관련 업무·중복 후보·감사 요약 + 수정/식별자/별칭/상태 액션.
 * merged source 는 수정이 제한된다.
 */
export function StartupDetailView({ detail }: { detail: StartupDetail }) {
  const { master } = detail;
  const { canWriteCurrent } = usePermissions();
  const [editOpen, setEditOpen] = useState(false);
  const [idOpen, setIdOpen] = useState(false);
  const [aliasOpen, setAliasOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const merged = master.status === "merged";
  const canEdit = canWriteCurrent && !merged;
  const v = verificationMeta(master.verificationStatus);
  const st = masterStatusMeta(master.status);
  const nextStatus = master.status === "archived" ? "active" : "archived";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={master.name}
        description={master.legalName ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge tone={v.tone}>{v.label}</StatusBadge>
            <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <MasterCodeBadge code={master.masterCode} />
        {master.sourceDomain && <span className="text-xs text-gray-400">유입: {master.sourceDomain}</span>}
      </div>

      {merged && (
        <div className="rounded-md border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          병합된(merged) 마스터입니다. 수정할 수 없습니다.
          {master.mergedIntoId && (
            <>
              {" "}
              <Link href={`/startups/${master.mergedIntoId}`} className="font-medium text-brand-700 underline">
                최종 마스터로 이동
              </Link>
            </>
          )}
        </div>
      )}

      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setEditOpen(true)}>
            기본 정보 수정
          </Button>
          <Button
            variant={nextStatus === "archived" ? "danger" : "outline"}
            onClick={() => setStatusOpen(true)}
          >
            {nextStatus === "archived" ? "마스터 보관" : "마스터 활성화"}
          </Button>
        </div>
      )}

      <section className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-3">
        <Field label="법인명" value={master.legalName} />
        <Field label="대표자명" value={master.representativeName} />
        <Field label="사업자번호" value={master.businessNumber} />
        <Field label="법인등록번호" value={master.corporationNumber} />
        <Field label="대표 연락처" value={master.phone} />
        <Field label="대표 이메일" value={master.email} />
        <Field label="홈페이지" value={master.websiteUrl} />
        <Field label="주소" value={master.address} />
        <Field label="산업분류" value={master.industry} />
        <Field label="성장단계" value={master.stage} />
        <Field label="생성일" value={fmtDateTime(master.createdAt)} />
        <Field label="수정일" value={fmtDateTime(master.updatedAt)} />
      </section>

      <IdentifiersSection identifiers={detail.identifiers} canWrite={canEdit} onAdd={() => setIdOpen(true)} />
      <AliasesSection aliases={detail.aliases} canWrite={canEdit} onAdd={() => setAliasOpen(true)} />
      <MergeCandidatesSection candidates={detail.mergeCandidates} />
      <FieldHistorySection history={detail.fieldHistory} />
      <RelatedWorkSection related={detail.relatedWork} />
      <AuditSummarySection audit={detail.auditSummary} />

      <EditStartupDialog open={editOpen} master={master} onClose={() => setEditOpen(false)} />
      <StatusChangeDialog open={statusOpen} id={master.id} nextStatus={nextStatus} onClose={() => setStatusOpen(false)} />
      <MasterAddDialog
        open={idOpen}
        title="식별자 추가"
        typeLabel="식별자 유형"
        valueLabel="식별자 값"
        valuePlaceholder="예: 123-45-67890"
        options={IDENTIFIER_TYPES.map((t) => ({ value: t, label: identifierLabel(t) }))}
        run={(type, value, reason) => addIdentifier({ id: master.id, identifierType: type, identifierValue: value, reason })}
        onClose={() => setIdOpen(false)}
      />
      <MasterAddDialog
        open={aliasOpen}
        title="별칭 추가"
        typeLabel="별칭 유형"
        valueLabel="별칭"
        valuePlaceholder="예: 예비창업팀 알파"
        options={ALIAS_TYPES.map((t) => ({ value: t, label: aliasLabel(t) }))}
        run={(type, value, reason) => addAlias({ id: master.id, aliasType: type, aliasValue: value, reason })}
        onClose={() => setAliasOpen(false)}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-0.5 truncate text-sm text-gray-900">{value ?? "—"}</p>
    </div>
  );
}
