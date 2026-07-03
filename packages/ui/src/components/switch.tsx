import { cn } from "../cn";

/**
 * Switch. read/write 등 boolean 을 켜고 끄는 순수 표현 토글.
 * (근거: yna_suite_design_system.md §10 — switch, DomainAccessSwitch 의 기반 primitive)
 *
 * 무의존 정책에 따라 role="switch" 를 가진 네이티브 button 으로 구현한다.
 * 상태(checked)와 onCheckedChange 는 소비하는 앱이 관리한다(표현만 담당).
 */
export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  /** 접근성 라벨(가시 라벨이 없을 때 필수). */
  "aria-label"?: string;
  id?: string;
  className?: string;
}

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  id,
  className,
  ...aria
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      aria-label={aria["aria-label"]}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-brand" : "bg-gray-300",
        className,
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
