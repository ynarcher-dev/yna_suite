import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "../cn";

/**
 * Button. 순수 표현 컴포넌트. (근거: yna_suite_design_system.md §11)
 *
 * variant: primary(주요 액션)/secondary/outline/ghost/danger(삭제·반려).
 * size: sm 32px / md 36px / lg 40px. 한 화면의 primary 는 가능한 하나만 둔다.
 * 아이콘 전용 버튼은 IconButton 을 사용한다(aria-label 강제).
 */
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-base font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-brand text-white hover:bg-brand-600 active:bg-brand-700",
        secondary: "bg-gray-100 text-gray-800 hover:bg-gray-200 active:bg-gray-300",
        outline:
          "border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 active:bg-gray-100",
        ghost: "text-gray-700 hover:bg-gray-100 active:bg-gray-200",
        danger: "bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900",
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-9 px-4",
        lg: "h-10 px-6",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
});
