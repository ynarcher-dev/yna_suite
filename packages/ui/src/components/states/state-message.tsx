import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../../cn";

/**
 * StateMessage. 전체 화면 중앙 안내(권한 없음/에러/없음 등)의 공통 레이아웃.
 * (근거: yna_suite_information_architecture.md §2 — 공통 상태 화면)
 */
export interface StateMessageProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** 아이콘 강조 톤. 위험 계열은 brand. */
  tone?: "neutral" | "danger";
  className?: string;
}

export function StateMessage({
  icon: Icon,
  title,
  description,
  action,
  tone = "neutral",
  className,
}: StateMessageProps) {
  return (
    <div
      className={cn(
        "flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center",
        className,
      )}
    >
      {Icon && (
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full",
            tone === "danger" ? "bg-brand-50 text-brand-700" : "bg-gray-100 text-gray-500",
          )}
        >
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
      )}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {description && <p className="mt-2 max-w-md text-base text-gray-500">{description}</p>}
      </div>
      {action && <div className="mt-2 flex items-center gap-2">{action}</div>}
    </div>
  );
}
