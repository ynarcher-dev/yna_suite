"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, MasterCodeBadge, PageHeader, StatusBadge } from "@yna/ui";
import { usePermissions } from "@/lib/auth/permission-context";
import {
  addExpertAlias,
  addExpertIdentifier,
  setExpertStatus,
  updateExpertBasic,
} from "@/lib/hub-data/actions-experts";
import { EDITABLE_EXPERT_FIELDS } from "@/lib/hub-data/masters";
import {
  ALIAS_TYPES,
  EXPERT_IDENTIFIER_TYPES,
  aliasLabel,
  fmtDateTime,
  identifierLabel,
  masterStatusMeta,
  verificationMeta,
} from "@/lib/hub-data/display";
import type { ExpertDetail } from "@/lib/hub-data/types";
import {
  AliasesSection,
  AuditSummarySection,
  FieldHistorySection,
  IdentifiersSection,
  MergeCandidatesSection,
  RelatedWorkSection,
} from "@/components/masters/detail-sections";
import { MasterAddDialog } from "@/components/masters/master-add-dialog";
import { MasterEditDialog } from "@/components/masters/master-edit-dialog";
import { MasterStatusDialog } from "@/components/masters/master-status-dialog";

/**
 * 전문가 마스터 상세. (근거: functional_spec §8)
 * 기본정보·연락처 식별자·전문분야·소속/직함(필드) 이력·관련 평가/멘토링·별칭 + 수정/식별자/별칭/상태.
 * 동명이인 가능성 때문에 이름만으로 자동 병합하지 않는다(중복 후보는 표시만, 승인은 Phase 1.10).
 */
export function ExpertDetailView({ detail }: { detail: ExpertDetail }) {
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

  const editInitial: Record<string, string> = {
    expertiseTags: master.expertiseTags.join(", "),
  };
  for (const f of EDITABLE_EXPERT_FIELDS) {
    const raw = master[f.key];
    editInitial[f.key] = typeof raw === "string" ? raw : "";
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={master.name}
        description={master.organization ?? undefined}
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
              <Link href={`/experts/${master.mergedIntoId}`} className="font-medium text-brand-700 underline">
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
          <Button variant={nextStatus === "archived" ? "danger" : "outline"} onClick={() => setStatusOpen(true)}>
            {nextStatus === "archived" ? "마스터 보관" : "마스터 활성화"}
          </Button>
        </div>
      )}

      <section className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-3">
        <Field label="이메일" value={master.email} />
        <Field label="연락처" value={master.phone} />
        <Field label="소속" value={master.organization} />
        <Field label="직함" value={master.position} />
        <Field label="생성일" value={fmtDateTime(master.createdAt)} />
        <Field label="수정일" value={fmtDateTime(master.updatedAt)} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-md font-semibold text-gray-900">전문 분야</h2>
        {master.expertiseTags.length === 0 ? (
          <p className="text-sm text-gray-500">등록된 전문 분야가 없습니다.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {master.expertiseTags.map((tag) => (
              <li key={tag} className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-sm text-gray-800">
                {tag}
              </li>
            ))}
          </ul>
        )}
      </section>

      <IdentifiersSection
        identifiers={detail.identifiers}
        canWrite={canEdit}
        onAdd={() => setIdOpen(true)}
        title="연락처 식별자"
      />
      <FieldHistorySection history={detail.fieldHistory} />
      <RelatedWorkSection related={detail.relatedWork} title="관련 평가/멘토링 요약" />
      <AliasesSection aliases={detail.aliases} canWrite={canEdit} onAdd={() => setAliasOpen(true)} />
      <MergeCandidatesSection candidates={detail.mergeCandidates} basePath="/experts" />
      <AuditSummarySection audit={detail.auditSummary} />

      <MasterEditDialog
        open={editOpen}
        title="전문가 정보 수정"
        fields={[
          ...EDITABLE_EXPERT_FIELDS.map((f) => ({ key: f.key, label: f.label, required: f.key === "name" })),
          { key: "expertiseTags", label: "전문분야 (쉼표로 구분)", fullWidth: true, placeholder: "예: SaaS, 핀테크" },
        ]}
        initial={editInitial}
        run={(values, reason) =>
          updateExpertBasic({ id: master.id, values, expertiseTags: values.expertiseTags ?? "", reason })
        }
        onClose={() => setEditOpen(false)}
      />
      <MasterStatusDialog
        open={statusOpen}
        nextStatus={nextStatus}
        run={(status, reason) => setExpertStatus({ id: master.id, status, reason })}
        onClose={() => setStatusOpen(false)}
      />
      <MasterAddDialog
        open={idOpen}
        title="연락처 식별자 추가"
        typeLabel="식별자 유형"
        valueLabel="식별자 값"
        valuePlaceholder="예: mentor@example.com"
        options={EXPERT_IDENTIFIER_TYPES.map((t) => ({ value: t, label: identifierLabel(t) }))}
        run={(type, value, reason) => addExpertIdentifier({ id: master.id, identifierType: type, identifierValue: value, reason })}
        onClose={() => setIdOpen(false)}
      />
      <MasterAddDialog
        open={aliasOpen}
        title="별칭 추가"
        typeLabel="별칭 유형"
        valueLabel="별칭"
        valuePlaceholder="예: Hong Mentor"
        options={ALIAS_TYPES.map((t) => ({ value: t, label: aliasLabel(t) }))}
        run={(type, value, reason) => addExpertAlias({ id: master.id, aliasType: type, aliasValue: value, reason })}
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
