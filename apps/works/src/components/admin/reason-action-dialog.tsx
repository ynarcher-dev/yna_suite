"use client";

import { useState, useTransition, type ReactNode } from "react";
import { ConfirmDialog, FormField, Input } from "@yna/ui";
import type { ActionResult } from "@/lib/admin-data/types";

/**
 * 사유 입력 + master 수준 확인 escalation 을 처리하는 공용 액션 dialog.
 * (근거: functional_spec §16 — 권한 변경 시 reason 입력, master 권한 변경은 확인 dialog)
 *
 * run 이 needsMasterConfirm 을 돌려주면 위험(danger) 확인 단계로 전환하고,
 * 다음 확인에서 confirmedMaster=true 로 재호출한다.
 */
export function ReasonActionDialog({
  open,
  title,
  description,
  confirmLabel = "저장",
  reasonLabel = "변경 사유",
  extra,
  run,
  onSuccess,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  reasonLabel?: string;
  /** 사유 위에 추가로 보여줄 내용(변경 요약 등). */
  extra?: ReactNode;
  run: (reason: string, confirmedMaster: boolean) => Promise<ActionResult>;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [masterStage, setMasterStage] = useState(false);

  function close() {
    setReason("");
    setError(null);
    setMasterStage(false);
    onCancel();
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await run(reason, masterStage);
      if (res.needsMasterConfirm && !masterStage) {
        setMasterStage(true);
        return;
      }
      if (!res.ok) {
        setError(res.error ?? "처리에 실패했습니다.");
        return;
      }
      setReason("");
      setMasterStage(false);
      onSuccess();
    });
  }

  return (
    <ConfirmDialog
      open={open}
      title={masterStage ? "master 수준 권한 변경 확인" : title}
      description={
        masterStage
          ? "Dev 관리자(master) 수준 권한이 변경됩니다. 계속하려면 확인하세요."
          : description
      }
      confirmLabel={masterStage ? "확인하고 적용" : confirmLabel}
      tone={masterStage ? "danger" : "primary"}
      busy={pending}
      onConfirm={submit}
      onCancel={close}
    >
      <div className="flex flex-col gap-3">
        {extra}
        <FormField label={reasonLabel} htmlFor="reason-input" required error={error ?? undefined}>
          <Input
            id="reason-input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="예: 사업부 이동에 따른 권한 조정"
          />
        </FormField>
      </div>
    </ConfirmDialog>
  );
}
