"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog, FormField, Input } from "@yna/ui";
import { setStartupStatus } from "@/lib/hub-data/actions";

/**
 * 스타트업 상태 변경(활성 ↔ 보관) 확인 dialog. 사유 필수 + audit 기록.
 * (근거: functional_spec §7 상태 변경, data_model §2 soft delete)
 */
export function StatusChangeDialog({
  open,
  id,
  nextStatus,
  onClose,
}: {
  open: boolean;
  id: string;
  nextStatus: "active" | "archived";
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const archiving = nextStatus === "archived";

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await setStartupStatus({ id, status: nextStatus, reason });
      if (!res.ok) {
        setError(res.error ?? "처리에 실패했습니다.");
        return;
      }
      setReason("");
      onClose();
      router.refresh();
    });
  }

  return (
    <ConfirmDialog
      open={open}
      title={archiving ? "마스터 보관" : "마스터 활성화"}
      description={
        archiving
          ? "보관하면 목록 기본 노출에서 제외됩니다. 물리 삭제가 아니며 복구할 수 있습니다."
          : "보관을 해제하고 다시 활성화합니다."
      }
      confirmLabel={archiving ? "보관" : "활성화"}
      tone={archiving ? "danger" : "primary"}
      busy={pending}
      onConfirm={submit}
      onCancel={() => {
        setReason("");
        setError(null);
        onClose();
      }}
    >
      <FormField label="변경 사유" htmlFor="st-reason" required error={error ?? undefined}>
        <Input id="st-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="예: 중복 확인 후 보관" />
      </FormField>
    </ConfirmDialog>
  );
}
