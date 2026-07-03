"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog, FormField, Input, Select } from "@yna/ui";
import type { ActionResult } from "@/lib/hub-data/types";

/**
 * 식별자/별칭처럼 (유형 + 값 + 사유) 구조를 공유하는 추가 dialog.
 * (근거: functional_spec §7 식별자/별칭 추가, api_contracts §10~11)
 */
export function MasterAddDialog({
  open,
  title,
  typeLabel,
  valueLabel,
  valuePlaceholder,
  options,
  run,
  onClose,
}: {
  open: boolean;
  title: string;
  typeLabel: string;
  valueLabel: string;
  valuePlaceholder?: string;
  options: { value: string; label: string }[];
  run: (type: string, value: string, reason: string) => Promise<ActionResult>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState(options[0]?.value ?? "");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setType(options[0]?.value ?? "");
    setValue("");
    setReason("");
    setError(null);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await run(type, value, reason);
      if (!res.ok) {
        setError(res.error ?? "처리에 실패했습니다.");
        return;
      }
      reset();
      onClose();
      router.refresh();
    });
  }

  return (
    <ConfirmDialog
      open={open}
      title={title}
      confirmLabel="추가"
      busy={pending}
      onConfirm={submit}
      onCancel={() => {
        reset();
        onClose();
      }}
    >
      <div className="flex flex-col gap-3">
        <FormField label={typeLabel} htmlFor="add-type">
          <Select id="add-type" value={type} onChange={(e) => setType(e.target.value)}>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label={valueLabel} htmlFor="add-value" required>
          <Input
            id="add-value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={valuePlaceholder}
          />
        </FormField>
        <FormField label="변경 사유" htmlFor="add-reason" required error={error ?? undefined}>
          <Input
            id="add-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="예: 사업자등록증 확인"
          />
        </FormField>
      </div>
    </ConfirmDialog>
  );
}
