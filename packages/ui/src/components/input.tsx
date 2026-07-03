import * as React from "react";
import { cn } from "../cn";

/**
 * Input. 순수 표현 컴포넌트. (근거: yna_suite_design_system.md §13)
 * 높이 36px(desktop). placeholder 를 label 대체로 쓰지 않는다.
 * invalid 상태는 aria-invalid 로 전달하면 border 를 danger 로 표시한다.
 */
export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-9 w-full rounded-md border border-gray-300 bg-white px-3 text-base text-gray-800 placeholder:text-gray-400",
        "focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30",
        "disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400",
        "aria-[invalid=true]:border-brand-700 aria-[invalid=true]:focus-visible:ring-brand-700/30",
        className,
      )}
      {...props}
    />
  );
});
