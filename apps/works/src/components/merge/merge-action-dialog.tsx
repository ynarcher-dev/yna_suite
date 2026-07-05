"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog, FormField, Input } from "@yna/ui";
import type { MergeApproveResult } from "@/lib/hub-data/types";

/**
 * 병합 승인/반려/무시/보류 확인 dialog(공용). 사유 필수 + audit 기록.
 * (근거: yna_suite_api_contracts.md §14~15, master_data_policy §15)
 */
export type MergeActionKind = "approve" | "reject" | "ignore" | "hold";

const META: Record<
  MergeActionKind,
  { title: string; description: string; confirm: string; tone: "primary" | "danger"; placeholder: string }
> = {
  approve: {
    title: "병합 승인",
    description:
      "소멸 마스터의 이력·식별자·별칭은 잔존 마스터로 승계됩니다. 승인 후 타 도메인 FK 는 백그라운드로 반영됩니다.",
    confirm: "병합 승인",
    tone: "danger",
    placeholder: "예: 동일 대표자 및 사업자번호 확인",
  },
  reject: {
    title: "병합 반려",
    description: "별도 법인/인물로 확인되어 병합하지 않습니다. 검토 이력으로 남습니다.",
    confirm: "반려",
    tone: "danger",
    placeholder: "예: 대표자명이 다르고 별도 법인으로 확인",
  },
  ignore: {
    title: "병합 무시",
    description: "낮은 품질 또는 반복 노이즈 후보로 처리합니다. 목록 기본 노출에서 제외됩니다.",
    confirm: "무시",
    tone: "primary",
    placeholder: "예: 이름만 유사한 저품질 후보",
  },
  hold: {
    title: "병합 보류",
    description: "추가 확인이 필요해 보류합니다. 나중에 다시 검토할 수 있습니다.",
    confirm: "보류",
    tone: "primary",
    placeholder: "예: 사업자번호 검증 후 재검토",
  },
};

export function MergeActionDialog({
  open,
  kind,
  disabled,
  run,
  onClose,
  onApproved,
}: {
  open: boolean;
  kind: MergeActionKind;
  disabled?: boolean;
  run: (reason: string) => Promise<MergeApproveResult>;
  onClose: () => void;
  onApproved?: (targetId?: string) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const meta = META[kind];

  function reset() {
    setReason("");
    setError(null);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await run(reason);
      if (!res.ok) {
        setError(res.error ?? "처리에 실패했습니다.");
        return;
      }
      reset();
      onClose();
      if (kind === "approve" && onApproved) onApproved(res.targetId);
      else router.refresh();
    });
  }

  return (
    <ConfirmDialog
      open={open}
      title={meta.title}
      description={meta.description}
      confirmLabel={meta.confirm}
      tone={meta.tone}
      busy={pending || disabled}
      onConfirm={submit}
      onCancel={() => {
        reset();
        onClose();
      }}
    >
      <FormField label="사유" htmlFor="merge-reason" required error={error ?? undefined}>
        <Input
          id="merge-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={meta.placeholder}
        />
      </FormField>
    </ConfirmDialog>
  );
}
