import { StatusBadge, type StatusTone } from "./status-badge";

/**
 * PermissionBadge. 도메인 접근 수준을 표시하는 배지.
 * (근거: yna_suite_design_system.md §10, yna_suite_auth_permissions.md)
 *
 * 순수 표현 컴포넌트: 접근 수준 문자열만 받아 표시한다. 실제 권한 판단은
 * packages/permissions(canRead/canWrite)에서 하고 결과 level 을 주입한다.
 */
export type PermissionLevel = "write" | "read" | "none" | "expired";

const config: Record<PermissionLevel, { label: string; tone: StatusTone }> = {
  write: { label: "쓰기", tone: "success" },
  read: { label: "읽기", tone: "info" },
  none: { label: "권한 없음", tone: "neutral" },
  expired: { label: "만료됨", tone: "danger" },
};

export interface PermissionBadgeProps {
  level: PermissionLevel;
  className?: string;
}

export function PermissionBadge({ level, className }: PermissionBadgeProps) {
  const { label, tone } = config[level];
  return (
    <StatusBadge tone={tone} className={className}>
      {label}
    </StatusBadge>
  );
}
