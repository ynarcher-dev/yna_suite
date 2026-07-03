"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, MasterCodeBadge, PageHeader, StatusBadge } from "@yna/ui";
import { usePermissions } from "@/lib/auth/permission-context";
import {
  addPartnerAlias,
  addPartnerIdentifier,
  setPartnerStatus,
  updatePartnerBasic,
} from "@/lib/hub-data/actions-partners";
import { EDITABLE_PARTNER_FIELDS } from "@/lib/hub-data/masters";
import {
  ALIAS_TYPES,
  PARTNER_IDENTIFIER_TYPES,
  PARTNER_TYPES,
  aliasLabel,
  fmtDateTime,
  identifierLabel,
  masterStatusMeta,
  partnerTypeLabel,
  verificationMeta,
} from "@/lib/hub-data/display";
import type { PartnerDetail } from "@/lib/hub-data/types";
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
 * 협력사 마스터 상세. (근거: functional_spec §9)
 * 기본정보·기관유형·식별자·별칭·관련 Project/Fund/M&A + 수정/식별자/별칭/상태.
 * 사업자번호가 있으면 중복 후보에 강하게 반영된다(중복 후보 생성/승인은 Phase 1.10).
 */
export function PartnerDetailView({ detail }: { detail: PartnerDetail }) {
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

  const editInitial: Record<string, string> = {};
  for (const f of EDITABLE_PARTNER_FIELDS) {
    const raw = master[f.key];
    editInitial[f.key] = typeof raw === "string" ? raw : "";
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={master.name}
        description={partnerTypeLabel(master.partnerType)}
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
              <Link href={`/partners/${master.mergedIntoId}`} className="font-medium text-brand-700 underline">
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
        <Field label="기관유형" value={partnerTypeLabel(master.partnerType)} />
        <Field label="사업자번호" value={master.businessNumber} />
        <Field label="대표자명" value={master.representativeName} />
        <Field label="대표 연락처" value={master.phone} />
        <Field label="대표 이메일" value={master.email} />
        <Field label="홈페이지" value={master.websiteUrl} />
        <Field label="주소" value={master.address} />
        <Field label="생성일" value={fmtDateTime(master.createdAt)} />
        <Field label="수정일" value={fmtDateTime(master.updatedAt)} />
      </section>

      <IdentifiersSection identifiers={detail.identifiers} canWrite={canEdit} onAdd={() => setIdOpen(true)} />
      <AliasesSection aliases={detail.aliases} canWrite={canEdit} onAdd={() => setAliasOpen(true)} />
      <MergeCandidatesSection candidates={detail.mergeCandidates} basePath="/partners" />
      <FieldHistorySection history={detail.fieldHistory} />
      <RelatedWorkSection
        related={detail.relatedWork}
        title="관련 Project/Fund/M&A 요약"
        emptyDescription="Project/Fund/M&A 등 도메인 앱 연결 후 발주·투자·자문 요약이 표시됩니다."
      />
      <AuditSummarySection audit={detail.auditSummary} />

      <MasterEditDialog
        open={editOpen}
        title="협력사 정보 수정"
        fields={EDITABLE_PARTNER_FIELDS.map((f) => ({
          key: f.key,
          label: f.label,
          required: f.key === "name",
          fullWidth: f.key === "address",
          placeholder: f.key === "partnerType" ? PARTNER_TYPES.join(" / ") : undefined,
        }))}
        initial={editInitial}
        run={(values, reason) => updatePartnerBasic({ id: master.id, values, reason })}
        onClose={() => setEditOpen(false)}
      />
      <MasterStatusDialog
        open={statusOpen}
        nextStatus={nextStatus}
        run={(status, reason) => setPartnerStatus({ id: master.id, status, reason })}
        onClose={() => setStatusOpen(false)}
      />
      <MasterAddDialog
        open={idOpen}
        title="식별자 추가"
        typeLabel="식별자 유형"
        valueLabel="식별자 값"
        valuePlaceholder="예: 123-45-67890"
        options={PARTNER_IDENTIFIER_TYPES.map((t) => ({ value: t, label: identifierLabel(t) }))}
        run={(type, value, reason) => addPartnerIdentifier({ id: master.id, identifierType: type, identifierValue: value, reason })}
        onClose={() => setIdOpen(false)}
      />
      <MasterAddDialog
        open={aliasOpen}
        title="별칭 추가"
        typeLabel="별칭 유형"
        valueLabel="별칭"
        valuePlaceholder="예: 스마트 법률사무소"
        options={ALIAS_TYPES.map((t) => ({ value: t, label: aliasLabel(t) }))}
        run={(type, value, reason) => addPartnerAlias({ id: master.id, aliasType: type, aliasValue: value, reason })}
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
