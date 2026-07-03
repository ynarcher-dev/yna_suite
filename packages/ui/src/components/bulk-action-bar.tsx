import * as React from "react";
import { cn } from "../cn";

/**
 * BulkActionBar. 목록에서 여러 행 선택 시 나타나는 일괄 액션 바.
 * (근거: yna_suite_design_system.md §12, yna_suite_hub_dev_functional_spec.md — 대량 처리)
 *
 * 선택 개수와 액션 버튼(children)을 표시한다. count 가 0 이면 렌더하지 않는다.
 */
export interface BulkActionBarProps {
  count: number;
  /** 선택 해제 콜백. */
  onClear?: () => void;
  children?: React.ReactNode;
  className?: string;
}

export function BulkActionBar({ count, onClear, children, className }: BulkActionBarProps) {
  if (count <= 0) return null;
  return (
    <div
      role="region"
      aria-label="일괄 작업"
      className={cn(
        "flex items-center justify-between gap-3 rounded-md border border-gray-300 bg-gray-800 px-3 py-2 text-white shadow-dropdown",
        className,
      )}
    >
      <div className="flex items-center gap-3 text-sm">
        <span className="font-medium">{count}건 선택됨</span>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-gray-300 underline-offset-2 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            선택 해제
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
