import * as React from "react";
import { cn } from "../cn";

/**
 * FilterBar. 목록 화면 상단의 검색/필터 툴바 레이아웃.
 * (근거: yna_suite_design_system.md §7·12 — toolbar 48px, 필터는 태블릿 2열 이하)
 *
 * 순수 레이아웃 컨테이너: 검색 입력·Select 등 실제 필터 컨트롤은 children 으로 주입한다.
 */
export interface FilterBarProps {
  children: React.ReactNode;
  /** 우측 정렬 액션(결과 수, 정렬 등). */
  trailing?: React.ReactNode;
  className?: string;
}

export function FilterBar({ children, trailing, className }: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-md border border-gray-200 bg-white p-2 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      {trailing && <div className="flex shrink-0 items-center gap-2">{trailing}</div>}
    </div>
  );
}
