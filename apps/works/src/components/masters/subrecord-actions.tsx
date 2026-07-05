"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, ConfirmDialog, FormField, Input, Select, StatusBadge } from "@yna/ui";
import {
  removeAliasAction,
  removeIdentifierAction,
  revealIdentifierAction,
  setIdentifierPrimaryAction,
  verifyIdentifierAction,
} from "@/lib/hub-data/actions-identifiers";
import {
  IDENTIFIER_VERIFIED_STATUSES,
  aliasLabel,
  identifierLabel,
  identifierVerifiedMeta,
  isSensitiveIdentifier,
  maskIdentifierValue,
} from "@/lib/hub-data/display";
import type { ActionResult, IdentifierVerifiedStatus, MasterAlias, MasterIdentifier } from "@/lib/hub-data/types";

/**
 * 상세 화면의 식별자/별칭 행 액션(엔티티 공용). (근거: master_data_policy §5~6, api_contracts §10~11)
 * 원본 조회(reveal)는 사유 없이 즉시 audit, 변경(대표/검증/삭제)은 사유 dialog 를 거친다.
 */

/** 사유 입력 dialog. 필요 시 상단에 부가 입력(status select 등)을 노출한다. */
function ReasonDialog({
  open,
  title,
  confirmLabel,
  extra,
  run,
  onClose,
}: {
  open: boolean;
  title: string;
  confirmLabel: string;
  extra?: React.ReactNode;
  run: (reason: string) => Promise<ActionResult>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function close() {
    setReason("");
    setError(null);
    onClose();
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await run(reason);
      if (!res.ok) {
        setError(res.error ?? "처리에 실패했습니다.");
        return;
      }
      close();
      router.refresh();
    });
  }

  return (
    <ConfirmDialog open={open} title={title} confirmLabel={confirmLabel} busy={pending} onConfirm={submit} onCancel={close}>
      <div className="flex flex-col gap-3">
        {extra}
        <FormField label="변경 사유" htmlFor="sub-reason" required error={error ?? undefined}>
          <Input id="sub-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="예: 사업자등록증 확인" />
        </FormField>
      </div>
    </ConfirmDialog>
  );
}

export function IdentifierRow({ identifier, canWrite }: { identifier: MasterIdentifier; canWrite: boolean }) {
  const router = useRouter();
  const [, startReveal] = useTransition();
  const [revealed, setRevealed] = useState(false);
  const [dialog, setDialog] = useState<null | "primary" | "verify" | "remove">(null);
  const [targetStatus, setTargetStatus] = useState<IdentifierVerifiedStatus>("verified");

  const sensitive = isSensitiveIdentifier(identifier.identifierType);
  const shown =
    sensitive && !revealed ? maskIdentifierValue(identifier.identifierType, identifier.identifierValue) : identifier.identifierValue;
  const vm = identifierVerifiedMeta(identifier.verifiedStatus);

  function reveal() {
    startReveal(async () => {
      const res = await revealIdentifierAction({ identifierId: identifier.id });
      if (res.ok) {
        setRevealed(true);
        router.refresh();
      }
    });
  }

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm">
      <span className="w-28 shrink-0 text-gray-500">{identifierLabel(identifier.identifierType)}</span>
      <span className="font-medium text-gray-800">{shown}</span>
      {identifier.isPrimary && <StatusBadge tone="info">대표</StatusBadge>}
      <StatusBadge tone={vm.tone}>{vm.label}</StatusBadge>
      <div className="ml-auto flex items-center gap-1.5">
        {sensitive && !revealed && (
          <Button variant="ghost" size="sm" onClick={reveal}>
            원본 보기
          </Button>
        )}
        {canWrite && !identifier.isPrimary && (
          <Button variant="ghost" size="sm" onClick={() => setDialog("primary")}>
            대표 지정
          </Button>
        )}
        {canWrite && (
          <Button variant="ghost" size="sm" onClick={() => setDialog("verify")}>
            검증 변경
          </Button>
        )}
        {canWrite && (
          <Button variant="ghost" size="sm" onClick={() => setDialog("remove")}>
            삭제
          </Button>
        )}
      </div>

      <ReasonDialog
        open={dialog === "primary"}
        title="대표 식별자 지정"
        confirmLabel="대표 지정"
        run={(reason) => setIdentifierPrimaryAction({ identifierId: identifier.id, reason })}
        onClose={() => setDialog(null)}
      />
      <ReasonDialog
        open={dialog === "verify"}
        title="식별자 검증 상태 변경"
        confirmLabel="변경"
        extra={
          <FormField label="검증 상태" htmlFor="verify-status">
            <Select
              id="verify-status"
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value as IdentifierVerifiedStatus)}
            >
              {IDENTIFIER_VERIFIED_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {identifierVerifiedMeta(s).label}
                </option>
              ))}
            </Select>
          </FormField>
        }
        run={(reason) => verifyIdentifierAction({ identifierId: identifier.id, verifiedStatus: targetStatus, reason })}
        onClose={() => setDialog(null)}
      />
      <ReasonDialog
        open={dialog === "remove"}
        title="식별자 삭제"
        confirmLabel="삭제"
        run={(reason) => removeIdentifierAction({ identifierId: identifier.id, reason })}
        onClose={() => setDialog(null)}
      />
    </li>
  );
}

export function AliasRow({ alias, canWrite }: { alias: MasterAlias; canWrite: boolean }) {
  const [dialog, setDialog] = useState(false);
  return (
    <li className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-2.5 py-1 text-sm">
      <span className="text-xs text-gray-400">{aliasLabel(alias.aliasType)}</span>
      <span className="text-gray-800">{alias.aliasValue}</span>
      {canWrite && (
        <button
          type="button"
          onClick={() => setDialog(true)}
          className="ml-1 text-xs text-gray-400 hover:text-brand-700"
          aria-label="별칭 삭제"
        >
          ✕
        </button>
      )}
      <ReasonDialog
        open={dialog}
        title="별칭 삭제"
        confirmLabel="삭제"
        run={(reason) => removeAliasAction({ aliasId: alias.id, reason })}
        onClose={() => setDialog(false)}
      />
    </li>
  );
}
