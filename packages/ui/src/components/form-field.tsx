import * as React from "react";
import { cn } from "../cn";

/**
 * FormField. label + helper/error 를 감싸는 순수 레이아웃 래퍼.
 * (근거: yna_suite_design_system.md §13 — label 13px, 에러는 필드 아래, 필수 표시)
 *
 * 실제 입력요소(Input/Textarea 등)는 children 으로 주입한다. 상태(RHF 등)는
 * 소비하는 앱이 관리하며 packages/ui 는 표현만 담당한다.
 */
export interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  helper?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

export function FormField({
  label,
  htmlFor,
  required,
  helper,
  error,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-gray-700">
        {label}
        {required && (
          <span className="ml-0.5 text-brand" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-brand-700">{error}</p>
      ) : helper ? (
        <p className="text-xs text-gray-500">{helper}</p>
      ) : null}
    </div>
  );
}
