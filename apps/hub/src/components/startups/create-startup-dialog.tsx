"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog, FormField, Input } from "@yna/ui";
import { createStartup } from "@/lib/hub-data/actions";

/**
 * 신규(임시) 스타트업 마스터 등록 dialog. (근거: functional_spec §6 신규 생성, §10 임시 마스터)
 * TEMP 코드·pending 검증으로 생성되며, 중복 후보 파이프라인은 Phase 1.8/1.10 에서 연결한다.
 */
export function CreateStartupDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    legalName: "",
    representativeName: "",
    businessNumber: "",
    phone: "",
    email: "",
  });

  function set(key: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [key]: v }));
  }

  function reset() {
    setForm({ name: "", legalName: "", representativeName: "", businessNumber: "", phone: "", email: "" });
    setError(null);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await createStartup(form);
      if (!res.ok) {
        setError(res.error ?? "생성에 실패했습니다.");
        return;
      }
      reset();
      onClose();
      if (res.createdId) router.push(`/startups/${res.createdId}`);
      else router.refresh();
    });
  }

  return (
    <ConfirmDialog
      open={open}
      title="신규 스타트업 등록"
      description="검증 전 임시 마스터로 등록됩니다. 검색 결과에 즉시 반영됩니다."
      confirmLabel="등록"
      busy={pending}
      onConfirm={submit}
      onCancel={() => {
        reset();
        onClose();
      }}
    >
      <div className="flex flex-col gap-3">
        <FormField label="표시명" htmlFor="c-name" required error={error ?? undefined}>
          <Input id="c-name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="예: 알파테크" />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="법인명" htmlFor="c-legal">
            <Input id="c-legal" value={form.legalName} onChange={(e) => set("legalName", e.target.value)} />
          </FormField>
          <FormField label="대표자명" htmlFor="c-rep">
            <Input id="c-rep" value={form.representativeName} onChange={(e) => set("representativeName", e.target.value)} />
          </FormField>
          <FormField label="사업자번호" htmlFor="c-biz">
            <Input id="c-biz" value={form.businessNumber} onChange={(e) => set("businessNumber", e.target.value)} placeholder="선택" />
          </FormField>
          <FormField label="대표 연락처" htmlFor="c-phone">
            <Input id="c-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="선택" />
          </FormField>
          <FormField label="대표 이메일" htmlFor="c-email" className="col-span-2">
            <Input id="c-email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="선택" />
          </FormField>
        </div>
      </div>
    </ConfirmDialog>
  );
}
