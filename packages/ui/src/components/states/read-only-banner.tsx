import { Eye } from "lucide-react";
import { cn } from "../../cn";

/**
 * ReadOnlyBanner. 읽기 전용 사용자에게 표시하는 상단 배너.
 * (근거: yna_suite_information_architecture.md §12 — read only 는 쓰기 액션 숨김/비활성)
 *
 * 색상만으로 상태를 전달하지 않도록 아이콘 + 텍스트를 함께 제공한다.
 */
export interface ReadOnlyBannerProps {
  message?: string;
  className?: string;
}

export function ReadOnlyBanner({ message, className }: ReadOnlyBannerProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600",
        className,
      )}
    >
      <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message ?? "읽기 전용 권한입니다. 변경 작업은 할 수 없습니다."}</span>
    </div>
  );
}
