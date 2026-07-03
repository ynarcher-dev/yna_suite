import * as React from "react";
import { cn } from "../cn";

/**
 * Textarea. 순수 표현 컴포넌트. (근거: yna_suite_design_system.md §13)
 */
export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, rows = 4, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-base text-gray-800 placeholder:text-gray-400",
        "focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30",
        "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400",
        "aria-[invalid=true]:border-brand-700 aria-[invalid=true]:focus-visible:ring-brand-700/30",
        className,
      )}
      {...props}
    />
  );
});
