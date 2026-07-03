import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../cn";

/**
 * EmptyState. 목록 비었음/결과 없음 등을 안내하는 공통 상태.
 * (근거: yna_suite_design_system.md §10, yna_suite_information_architecture.md §2)
 */
export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** 액션(예: "새로 만들기" 버튼). */
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-gray-200 px-6 py-12 text-center",
        className,
      )}
    >
      {Icon && <Icon className="h-8 w-8 text-gray-400" aria-hidden="true" />}
      <div>
        <p className="text-md font-medium text-gray-800">{title}</p>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
