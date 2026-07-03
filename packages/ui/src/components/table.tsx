import * as React from "react";
import { cn } from "../cn";

/**
 * Table primitives. 순수 표현 컴포넌트.
 * (근거: yna_suite_design_system.md §12 — header 36px, row 40/44px, cell px 12px,
 *        cell 13px, header bg gray.50, border gray.200, 숫자 우측정렬)
 *
 * 무의존 정책에 따라 TanStack Table 없이 시맨틱 <table> 를 스타일링한다.
 * 정렬/페이지네이션 같은 상태는 소비하는 앱이 관리한다.
 */

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-md border border-gray-200">
      <table className={cn("w-full border-collapse text-sm", className)} {...props} />
    </div>
  );
}

export function THead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-gray-50", className)} {...props} />;
}

export function TBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-gray-200", className)} {...props} />;
}

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  /** 선택된 행 강조(design_system §12 — selected row red.25). */
  selected?: boolean;
  /** 행 클릭 가능(hover 표시). */
  interactive?: boolean;
}

export function TR({ className, selected, interactive, ...props }: TableRowProps) {
  return (
    <tr
      className={cn(
        selected ? "bg-red-50" : "bg-white",
        interactive && "cursor-pointer hover:bg-gray-50",
        className,
      )}
      {...props}
    />
  );
}

export interface TableCellProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  /** 숫자 컬럼 우측 정렬(design_system §12). */
  numeric?: boolean;
}

export function TH({ className, numeric, ...props }: TableCellProps) {
  return (
    <th
      scope="col"
      className={cn(
        "h-9 whitespace-nowrap px-3 text-xs font-medium text-gray-500",
        numeric ? "text-right" : "text-left",
        className,
      )}
      {...props}
    />
  );
}

export function TD({ className, numeric, ...props }: TableCellProps) {
  return (
    <td
      className={cn(
        "h-11 px-3 text-gray-800",
        numeric ? "text-right tabular-nums" : "text-left",
        className,
      )}
      {...props}
    />
  );
}
