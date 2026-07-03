"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog, FormField, Input } from "@yna/ui";
import { EDITABLE_STARTUP_FIELDS } from "@/lib/hub-data/masters";
import { updateStartupBasic } from "@/lib/hub-data/actions";
import type { StartupMaster } from "@/lib/hub-data/types";

/**
 * 스타트업 기본 정보 수정 dialog. (근거: functional_spec §7, api_contracts §9)
 * 변경된 필드는 field_history 로 기록되고 민감 필드 변경은 audit 대상이다(액션에서 처리).
 * 변경 사유(reason)는 필수다.
 */
export function EditStartupDialog({
  open,
  master,
  onClose,
}: {
  open: boolean;
  master: StartupMaster;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>(() => initial(master));
  const [reason, setReason] = useState("");

  function set(key: string, v: string) {
    setValues((s) => ({ ...s, [key]: v }));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await updateStartupBasic({ id: master.id, values, reason });
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
      title="기본 정보 수정"
      confirmLabel="저장"
      busy={pending}
      onConfirm={submit}
      onCancel={() => {
        setValues(initial(master));
        setReason("");
        setError(null);
        onClose();
      }}
    >
      <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-3">
          {EDITABLE_STARTUP_FIELDS.map((f) => (
            <FormField
              key={f.key}
              label={f.label}
              htmlFor={`e-${f.key}`}
              required={f.key === "name"}
              className={f.key === "address" ? "col-span-2" : undefined}
            >
              <Input id={`e-${f.key}`} value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} />
            </FormField>
          ))}
        </div>
        <FormField label="변경 사유" htmlFor="e-reason" required error={error ?? undefined}>
          <Input id="e-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="예: 법인 설립 정보 반영" />
        </FormField>
      </div>
    </ConfirmDialog>
  );
}

function initial(master: StartupMaster): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of EDITABLE_STARTUP_FIELDS) {
    const v = master[f.key];
    out[f.key] = typeof v === "string" ? v : "";
  }
  return out;
}
