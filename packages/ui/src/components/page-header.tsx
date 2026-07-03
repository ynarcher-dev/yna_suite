import * as React from "react";
import { cn } from "../cn";

/**
 * PageHeader. 페이지 제목 + 설명 + 우측 액션 영역.
 * (근거: yna_suite_design_system.md §6·9 — 페이지 제목 22px)
 */
export interface PageHeaderProps {
  title: string;
  description?: string;
  /** 우측 액션(버튼 등). primary action 은 화면당 하나 권장. */
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-gray-200 pb-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
