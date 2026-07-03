import * as React from "react";
import { cn } from "../cn";

/**
 * MasterCodeBadge. 마스터 코드(사람이 보는 식별자)를 표시하는 monospace 배지.
 * (근거: yna_suite_design_system.md §10, yna_suite_data_model.md — master_code)
 *
 * 순수 프레젠테이션형 특화 컴포넌트(데이터 주입형).
 */
export interface MasterCodeBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  code: string;
}

export function MasterCodeBadge({ code, className, ...props }: MasterCodeBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-xs text-gray-700",
        className,
      )}
      {...props}
    >
      {code}
    </span>
  );
}
