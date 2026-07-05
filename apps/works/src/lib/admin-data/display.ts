import type { Domain, PermissionMap } from "@yna/core";
import { canRead, canWrite } from "@yna/permissions";
import type { PermissionLevel } from "@yna/ui";
import type { UserStatus } from "./types";

/**
 * 관리(ADMIN) 섹션 화면 표시용 라벨/변환 헬퍼(순수). 서버·클라이언트 공용.
 * (근거: yna_suite_design_system.md §12 — 날짜 YYYY-MM-DD, 상태는 StatusBadge)
 */

/** 매트릭스/배지용 짧은 도메인 라벨. */
export const DOMAIN_SHORT: Record<Domain, string> = {
  hub: "HUB",
  admin: "관리",
  ac: "AC",
  mna: "M&A",
  project: "Project",
  fund: "Fund",
  management: "경영관리",
};

const STATUS_META: Record<UserStatus, { label: string; tone: "success" | "warning" | "neutral" }> = {
  active: { label: "활성", tone: "success" },
  invited: { label: "초대됨", tone: "warning" },
  disabled: { label: "비활성", tone: "neutral" },
};

export function statusMeta(status: UserStatus) {
  return STATUS_META[status];
}

/** 특정 도메인의 권한 수준(배지 표시용). 만료 임시 권한은 expired. */
export function domainLevel(
  permissions: PermissionMap,
  domain: Domain,
  now: Date = new Date(),
): PermissionLevel {
  const perm = permissions[domain];
  if (!perm) return "none";
  if (perm.expires_at && new Date(perm.expires_at).getTime() <= now.getTime()) return "expired";
  if (canWrite(permissions, domain, now)) return "write";
  if (canRead(permissions, domain, now)) return "read";
  return "none";
}

/** ISO 문자열을 YYYY-MM-DD 로. 없으면 대시. */
export function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
}

const ACTION_LABEL: Record<string, string> = {
  update: "권한 변경",
  apply_template: "템플릿 적용",
  invite: "사용자 초대",
  invite_external: "외부 사용자 초대",
  link_external: "외부 사용자 연결",
  set_status: "상태 변경",
};

export function actionLabel(action: string): string {
  return ACTION_LABEL[action] ?? action;
}

/** ISO 문자열을 YYYY-MM-DD HH:mm 로. */
export function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}`;
}
