import type { EntityType } from "@yna/core";
import type { StatusTone } from "@yna/ui";
import type { MasterStatus, VerificationStatus } from "./types";

/**
 * Hub 화면 표시용 라벨/포맷 헬퍼(순수). 서버·클라이언트 공용.
 * (근거: yna_suite_design_system.md §12 — 날짜 YYYY-MM-DD, 상태는 StatusBadge)
 */

const VERIFICATION_META: Record<VerificationStatus, { label: string; tone: StatusTone }> = {
  verified: { label: "검증됨", tone: "success" },
  pending: { label: "검토대기", tone: "warning" },
  temporary: { label: "임시", tone: "warning" },
  needs_review: { label: "재검토", tone: "info" },
  rejected: { label: "반려", tone: "danger" },
};

export function verificationMeta(v: VerificationStatus) {
  return VERIFICATION_META[v];
}

const STATUS_META: Record<MasterStatus, { label: string; tone: StatusTone }> = {
  active: { label: "활성", tone: "success" },
  merged: { label: "병합됨", tone: "neutral" },
  archived: { label: "보관", tone: "neutral" },
  deleted: { label: "삭제", tone: "danger" },
};

export function masterStatusMeta(s: MasterStatus) {
  return STATUS_META[s];
}

export const ENTITY_LABEL: Record<EntityType, string> = {
  startup: "스타트업",
  expert: "전문가",
  partner: "협력사",
  manager: "매니저",
};

const IDENTIFIER_LABEL: Record<string, string> = {
  business_number: "사업자번호",
  corporation_number: "법인등록번호",
  founder_phone: "대표 연락처",
  founder_email: "대표 이메일",
  website_domain: "웹사이트 도메인",
  external_id: "외부 시스템 ID",
};

export function identifierLabel(type: string): string {
  return IDENTIFIER_LABEL[type] ?? type;
}

export const IDENTIFIER_TYPES = Object.keys(IDENTIFIER_LABEL);

const ALIAS_LABEL: Record<string, string> = {
  previous_name: "과거명",
  short_name: "약칭",
  english_name: "영문명",
  brand_name: "브랜드명",
  team_name: "팀명",
  typo: "오탈자명",
};

export function aliasLabel(type: string): string {
  return ALIAS_LABEL[type] ?? type;
}

export const ALIAS_TYPES = Object.keys(ALIAS_LABEL);

const ACTION_LABEL: Record<string, string> = {
  create: "생성",
  create_temporary: "임시 생성",
  update: "정보 변경",
  add_identifier: "식별자 추가",
  add_alias: "별칭 추가",
  set_status: "상태 변경",
  merge: "병합",
};

export function auditActionLabel(action: string): string {
  return ACTION_LABEL[action] ?? action;
}

/** 민감 식별자(사업자/법인/전화/이메일) 여부 — 목록/요약 마스킹 대상. */
export function isSensitiveIdentifier(type: string): boolean {
  return type === "business_number" || type === "corporation_number" || type === "founder_phone" || type === "founder_email";
}

/** ISO 문자열을 YYYY-MM-DD 로. */
export function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0, 10);
}

/** ISO 문자열을 YYYY-MM-DD HH:mm 로. */
export function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toISOString().slice(0, 10)} ${d.toISOString().slice(11, 16)}`;
}
