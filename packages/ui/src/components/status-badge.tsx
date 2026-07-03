import * as React from "react";
import { cn } from "../cn";

/**
 * StatusBadge. 업무 상태 신호 배지. (근거: yna_suite_design_system.md §4·12)
 *
 * 색상만으로 상태를 구분하지 않으므로 항상 텍스트(children)를 함께 표시한다.
 * 위험/반려 계열은 danger(red) 를 사용한다.
 */
export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

const toneClasses: Record<StatusTone, string> = {
  success: "bg-success-subtle text-success border-success-border",
  warning: "bg-warning-subtle text-warning border-warning-border",
  danger: "bg-red-50 text-red-700 border-red-200",
  info: "bg-info-subtle text-info border-info-border",
  neutral: "bg-gray-50 text-gray-700 border-gray-200",
};

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: StatusTone;
}

export function StatusBadge({ tone = "neutral", className, children, ...props }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
