"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ROLE_TEMPLATES, type RoleTemplate } from "@yna/core";
import { ConfirmDialog, FormField, Input, Select } from "@yna/ui";
import { templateDisplayName } from "@/lib/dev-data/templates";
import { inviteUser } from "@/lib/dev-data/actions";

/**
 * 사용자 초대. (근거: functional_spec §15·§19, api_contracts §18)
 * Auth 계정 생성/초대와 권한 부여를 하나의 작업으로 처리한다(외부 사용자는 연결 마스터 필수).
 */
export function InviteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<RoleTemplate>("viewer");
  const [masterId, setMasterId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isExternal = role === "guest_startup" || role === "guest_expert";

  function reset() {
    setName("");
    setEmail("");
    setRole("viewer");
    setMasterId("");
    setReason("");
    setError(null);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await inviteUser({
        name,
        email,
        role,
        reason,
        externalMasterId: isExternal ? masterId : null,
      });
      if (!res.ok) {
        setError(res.error ?? "초대에 실패했습니다.");
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
      title="사용자 초대"
      description="계정 초대와 역할 권한 부여가 함께 처리됩니다."
      confirmLabel="초대"
      busy={pending}
      onConfirm={submit}
      onCancel={() => {
        reset();
        onClose();
      }}
    >
      <div className="flex flex-col gap-3">
        <FormField label="이름" htmlFor="invite-name" required>
          <Input id="invite-name" value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>
        <FormField label="이메일" htmlFor="invite-email" required>
          <Input
            id="invite-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </FormField>
        <FormField label="역할" htmlFor="invite-role" required>
          <Select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value as RoleTemplate)}
          >
            {ROLE_TEMPLATES.map((r) => (
              <option key={r} value={r}>
                {templateDisplayName(r)}
              </option>
            ))}
          </Select>
        </FormField>
        {isExternal && (
          <FormField
            label={role === "guest_startup" ? "연결 스타트업 ID" : "연결 전문가 ID"}
            htmlFor="invite-master"
            required
            helper="외부 사용자는 반드시 대상 마스터와 연결됩니다."
          >
            <Input
              id="invite-master"
              value={masterId}
              onChange={(e) => setMasterId(e.target.value)}
            />
          </FormField>
        )}
        <FormField label="초대 사유" htmlFor="invite-reason" required error={error ?? undefined}>
          <Input id="invite-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        </FormField>
      </div>
    </ConfirmDialog>
  );
}
