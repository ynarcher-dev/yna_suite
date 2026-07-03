import type { EntityType } from "@yna/core";
import type { StatusTone } from "@yna/ui";
import { maskBusinessNumber, maskEmail, maskPhone } from "@yna/utils";
import type {
  IdentifierVerifiedStatus,
  MasterStatus,
  MergeCandidateStatus,
  MergeSyncStatus,
  VerificationStatus,
} from "./types";

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

const IDENTIFIER_VERIFIED_META: Record<
  IdentifierVerifiedStatus,
  { label: string; tone: StatusTone }
> = {
  verified: { label: "검증됨", tone: "success" },
  unverified: { label: "미검증", tone: "neutral" },
  rejected: { label: "반려", tone: "danger" },
};

export function identifierVerifiedMeta(v: IdentifierVerifiedStatus) {
  return IDENTIFIER_VERIFIED_META[v];
}

/** PATCH 식별자 검증상태 옵션(검증/반려/미검증). */
export const IDENTIFIER_VERIFIED_STATUSES: IdentifierVerifiedStatus[] = [
  "verified",
  "rejected",
  "unverified",
];

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
  email: "이메일",
  phone: "연락처",
  website_domain: "웹사이트 도메인",
  external_id: "외부 시스템 ID",
};

export function identifierLabel(type: string): string {
  return IDENTIFIER_LABEL[type] ?? type;
}

/** 스타트업 식별자 유형(추가 dialog 옵션). */
export const IDENTIFIER_TYPES = [
  "business_number",
  "corporation_number",
  "founder_phone",
  "founder_email",
  "website_domain",
  "external_id",
];

/** 전문가 연락처 식별자 유형. (functional_spec §8) */
export const EXPERT_IDENTIFIER_TYPES = ["email", "phone", "external_id"];

/** 협력사 식별자 유형. (functional_spec §9 — 사업자번호 강하게 반영) */
export const PARTNER_IDENTIFIER_TYPES = [
  "business_number",
  "founder_phone",
  "founder_email",
  "website_domain",
  "external_id",
];

const PARTNER_TYPE_LABEL: Record<string, string> = {
  lp: "LP",
  advisor: "자문사",
  operator: "수행기관",
  consortium: "컨소시엄 파트너",
  institution: "기관",
  other: "기타",
};

export function partnerTypeLabel(type: string | null): string {
  if (!type) return "—";
  return PARTNER_TYPE_LABEL[type] ?? type;
}

export const PARTNER_TYPES = Object.keys(PARTNER_TYPE_LABEL);

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
  set_primary: "대표 식별자 지정",
  verify_identifier: "식별자 검증 변경",
  remove_identifier: "식별자 삭제",
  add_alias: "별칭 추가",
  remove_alias: "별칭 삭제",
  view_sensitive: "민감정보 원본 조회",
  set_status: "상태 변경",
  merge: "병합",
  reject_merge: "병합 반려",
  ignore_merge: "병합 무시",
  hold_merge: "병합 보류",
};

const MERGE_STATUS_META: Record<MergeCandidateStatus, { label: string; tone: StatusTone }> = {
  pending: { label: "검토대기", tone: "warning" },
  approved: { label: "병합완료", tone: "success" },
  rejected: { label: "반려", tone: "danger" },
  ignored: { label: "무시", tone: "neutral" },
  on_hold: { label: "보류", tone: "info" },
  expired: { label: "만료", tone: "neutral" },
};

export function mergeStatusMeta(s: MergeCandidateStatus) {
  return MERGE_STATUS_META[s] ?? { label: s, tone: "neutral" as StatusTone };
}

const MERGE_SYNC_META: Record<MergeSyncStatus, { label: string; tone: StatusTone }> = {
  pending: { label: "반영중", tone: "warning" },
  completed: { label: "반영완료", tone: "success" },
  failed: { label: "반영실패", tone: "danger" },
};

export function mergeSyncMeta(s: string) {
  return MERGE_SYNC_META[s as MergeSyncStatus] ?? { label: s, tone: "neutral" as StatusTone };
}

const REASON_LABEL: Record<string, string> = {
  business_number_match: "사업자번호 일치",
  corporation_number_match: "법인등록번호 일치",
  normalized_name_exact: "이름 정확 일치",
  normalized_name_similar: "이름 유사",
  representative_name_match: "대표자명 일치",
  founder_phone_match: "대표 연락처 일치",
  founder_email_match: "대표 이메일 일치",
  website_domain_match: "웹사이트 도메인 일치",
  business_number_conflict: "사업자번호 상충",
  corporation_number_conflict: "법인등록번호 상충",
  representative_name_conflict: "대표자명 상충",
  email_conflict: "이메일 상충",
  phone_conflict: "연락처 상충",
  website_domain_conflict: "웹사이트 도메인 상충",
};

/** 중복 후보 매칭 사유·충돌 경고 키를 한글 라벨로. */
export function reasonLabel(key: string): string {
  return REASON_LABEL[key] ?? key;
}

const FIELD_POLICY_LABEL: Record<string, string> = {
  target: "잔존 우선",
  source: "소멸 우선",
  source_if_verified: "검증 시 소멸값",
  prefer_filled: "채워진 값 우선",
  union: "합집합",
};

/** 병합 필드 정책 키를 한글 라벨로. */
export function fieldPolicyLabel(key: string): string {
  return FIELD_POLICY_LABEL[key] ?? key;
}

export function auditActionLabel(action: string): string {
  return ACTION_LABEL[action] ?? action;
}

/** 민감 식별자(사업자/법인/전화/이메일) 여부 — 목록/요약 마스킹 대상. */
export function isSensitiveIdentifier(type: string): boolean {
  return (
    type === "business_number" ||
    type === "corporation_number" ||
    type === "founder_phone" ||
    type === "founder_email" ||
    type === "phone" ||
    type === "email"
  );
}

/** 식별자 유형별 마스킹 표시값(민감 식별자만). 원본 조회는 audit + reveal 로 처리한다. */
export function maskIdentifierValue(type: string, value: string): string {
  if (type === "business_number" || type === "corporation_number") return maskBusinessNumber(value);
  if (type === "founder_phone" || type === "phone") return maskPhone(value);
  if (type === "founder_email" || type === "email") return maskEmail(value);
  return value;
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
