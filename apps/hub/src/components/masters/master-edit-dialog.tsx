"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog, FormField, Input } from "@yna/ui";
import type { ActionResult } from "@/lib/hub-data/types";

/**
 * 마스터 기본 정보 수정 dialog(스타트업/전문가/협력사 공용). (근거: functional_spec §7~9, api_contracts §9)
 * 변경된 필드는 field_history 로 기록되고 민감 필드 변경은 audit 대상이다(액션에서 처리). 사유 필수.
 */
export interface EditField {
  key: string;
  label: string;
  fullWidth?: boolean;
  required?: boolean;
  placeholder?: string;
}

export function MasterEditDialog({
  open,
  title,
  fields,
  initial,
  run,
  onClose,
}: {
  open: boolean;
  title: string;
  fields: EditField[];
  initial: Record<string, string>;
  run: (values: Record<string, string>, reason: string) => Promise<ActionResult>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [reason, setReason] = useState("");

  function set(key: string, v: string) {
    setValues((s) => ({ ...s, [key]: v }));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await run(values, reason);
      if (!res.ok) {
        setError(res.error ?? "저장에 실패했습니다.");
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
      title={title}
      confirmLabel="저장"
      busy={pending}
      onConfirm={submit}
      onCancel={() => {
        setValues(initial);
        setReason("");
        setError(null);
        onClose();
      }}
    >
      <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-3">
          {fields.map((f) => (
            <FormField
              key={f.key}
              label={f.label}
              htmlFor={`e-${f.key}`}
              required={f.required}
              className={f.fullWidth ? "col-span-2" : undefined}
            >
              <Input
                id={`e-${f.key}`}
                value={values[f.key] ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.placeholder}
              />
            </FormField>
          ))}
        </div>
        <FormField label="변경 사유" htmlFor="e-reason" required error={error ?? undefined}>
          <Input id="e-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="예: 정보 갱신 확인" />
        </FormField>
      </div>
    </ConfirmDialog>
  );
}
