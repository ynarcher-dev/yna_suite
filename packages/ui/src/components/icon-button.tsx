import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../cn";

/**
 * IconButton. 아이콘 전용 버튼. (근거: yna_suite_design_system.md §11·14)
 *
 * aria-label 을 필수로 받는다(접근성: 모든 아이콘 버튼에 라벨 제공).
 * 터치 대상 최소 크기 확보를 위해 sm 도 32px 를 유지한다.
 */
const iconButtonVariants = cva(
  "inline-flex items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        ghost: "text-gray-600 hover:bg-gray-100 active:bg-gray-200",
        outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
        danger: "text-brand-700 hover:bg-brand-50 active:bg-brand-100",
      },
      size: {
        sm: "h-8 w-8",
        md: "h-9 w-9",
        lg: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "ghost", size: "md" },
  },
);

export type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof iconButtonVariants> & {
    /** 접근성 필수: 아이콘 버튼의 의미를 설명. */
    "aria-label": string;
  };

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, variant, size, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(iconButtonVariants({ variant, size }), className)}
      {...props}
    />
  );
});
