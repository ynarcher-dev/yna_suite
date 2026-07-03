"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, PageHeader, StatusBadge } from "@yna/ui";
import { candidateStrength } from "@yna/master-data";
import { usePermissions } from "@/lib/auth/permission-context";
import {
  approveMergeCandidate,
  holdMergeCandidate,
  ignoreMergeCandidate,
  rejectMergeCandidate,
} from "@/lib/hub-data/actions-merge";
import { ENTITY_LABEL, fmtDate, mergeStatusMeta, reasonLabel } from "@/lib/hub-data/display";
import type { MergeApproveResult, MergeCandidateDetail } from "@/lib/hub-data/types";
import { ComparePanel, FieldResolutionTable, PreviewWarnings } from "@/components/merge/compare-panel";
import { MergeActionDialog, type MergeActionKind } from "@/components/merge/merge-action-dialog";

/**
 * 중복 후보 상세(좌우 비교 + 미리보기 + 승인/반려/무시/보류).
 * (근거: functional_spec §15, api_contracts §13~15, master_data_policy §10·14)
 */
const BASE_PATH: Record<string, string> = {
  startup: "/startups",
  expert: "/experts",
  partner: "/partners",
};
const STRENGTH_TONE = { strong: "danger", medium: "warning", weak: "neutral", none: "neutral" } as const;

export function MergeCandidateDetailView({ detail }: { detail: MergeCandidateDetail }) {
  const router = useRouter();
  const { canWriteCurrent } = usePermissions();
  const [dialog, setDialog] = useState<MergeActionKind | null>(null);

  const st = mergeStatusMeta(detail.status);
  const strong = candidateStrength(detail.score);
  const basePath = BASE_PATH[detail.entityType];
  const open = detail.status === "pending" || detail.status === "on_hold";
  const canAct = canWriteCurrent && open;
  const targetHref = `${basePath}/${detail.target.ref.id}`;

  const runners: Record<MergeActionKind, (reason: string) => Promise<MergeApproveResult>> = {
    approve: (reason) => approveMergeCandidate({ id: detail.id, reason }),
    reject: (reason) => rejectMergeCandidate({ id: detail.id, reason }),
    ignore: (reason) => ignoreMergeCandidate({ id: detail.id, reason }),
    hold: (reason) => holdMergeCandidate({ id: detail.id, reason }),
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${ENTITY_LABEL[detail.entityType]} 중복 후보`}
        description={`생성일 ${fmtDate(detail.createdAt)}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge tone={STRENGTH_TONE[strong]}>{Math.round(detail.score)}점</StatusBadge>
            <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-1.5">
        {detail.reasons.map((r) => (
          <span key={r} className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-600">
            {reasonLabel(r)}
          </span>
        ))}
      </div>

      {!open && (
        <div className="rounded-md border border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          이 후보는 <span className="font-medium">{st.label}</span> 처리되었습니다.{" "}
          <Link href={targetHref} className="font-medium text-brand-700 underline">
            잔존 마스터로 이동
          </Link>
        </div>
      )}

      <PreviewWarnings preview={detail.preview} />
      <ComparePanel source={detail.source} target={detail.target} />
      <FieldResolutionTable rows={detail.preview.fieldResolution} />

      {canAct && (
        <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
          <Button variant="danger" disabled={detail.preview.blocked} onClick={() => setDialog("approve")}>
            병합 승인
          </Button>
          <Button variant="outline" onClick={() => setDialog("hold")}>
            보류
          </Button>
          <Button variant="outline" onClick={() => setDialog("reject")}>
            반려
          </Button>
          <Button variant="ghost" onClick={() => setDialog("ignore")}>
            무시
          </Button>
        </div>
      )}

      {dialog && (
        <MergeActionDialog
          open
          kind={dialog}
          disabled={dialog === "approve" && detail.preview.blocked}
          run={runners[dialog]}
          onClose={() => setDialog(null)}
          onApproved={() => router.push(targetHref)}
        />
      )}
    </div>
  );
}
