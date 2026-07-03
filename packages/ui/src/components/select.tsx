import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../cn";

/**
 * Select. 네이티브 `<select>` 기반 순수 표현 컴포넌트.
 * (근거: yna_suite_design_system.md §10·13 — Input 과 동일한 높이/포커스 규격)
 *
 * 무의존 정책에 따라 Radix 대신 네이티브 select 를 스타일링해 사용한다.
 * 옵션은 children(<option>) 으로 주입한다. invalid 는 aria-invalid 로 전달한다.
 */
export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "h-9 w-full appearance-none rounded-md border border-gray-300 bg-white pl-3 pr-9 text-base text-gray-800",
          "focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30",
          "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400",
          "aria-[invalid=true]:border-brand-700 aria-[invalid=true]:focus-visible:ring-brand-700/30",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
        aria-hidden="true"
      />
    </div>
  );
});
