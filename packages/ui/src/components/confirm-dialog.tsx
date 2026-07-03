"use client";

import * as React from "react";
import { Button } from "./button";
import { cn } from "../cn";

/**
 * ConfirmDialog. 위험/중요 액션 확인용 모달.
 * (근거: yna_suite_design_system.md §11·§7 — 삭제/반려·master 권한 변경은 confirm dialog,
 *        radius.lg 8px, shadow dialog)
 *
 * 무의존 정책에 따라 Radix 없이 controlled 오버레이로 구현한다. open/onConfirm/onCancel
 * 상태는 소비하는 앱이 관리한다. Escape 로 취소, 열릴 때 확인 버튼에 포커스한다.
 */
export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 위험 액션이면 danger 버튼 사용. */
  tone?: "primary" | "danger";
  /** 처리 중이면 버튼 비활성화. */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** 추가 입력(사유 등)을 body 에 렌더. */
  children?: React.ReactNode;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "확인",
  cancelLabel = "취소",
  tone = "primary",
  busy,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const confirmRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-gray-900/40"
        onClick={() => !busy && onCancel()}
        aria-hidden="true"
      />
      <div
        className={cn(
          "relative w-full max-w-md rounded-lg bg-white p-5 shadow-dialog",
          "flex flex-col gap-4",
        )}
      >
        <div className="flex flex-col gap-1.5">
          <h2 className="text-md font-semibold text-gray-900">{title}</h2>
          {description && <div className="text-sm text-gray-600">{description}</div>}
        </div>
        {children}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={onConfirm}
            disabled={busy}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
