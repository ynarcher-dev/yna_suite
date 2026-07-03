import type { EntityType } from "@yna/core";

/**
 * Hub 마스터 화면(대시보드·통합 검색·스타트업 마스터)의 도메인 타입.
 * (근거: yna_suite_hub_dev_functional_spec.md §4~7, yna_suite_data_model.md §4)
 *
 * 실제 조회/변경은 Docker/staging 에서 hub 스키마에 연결하고(이슈19·21),
 * 현재는 mock seam 으로 화면·배선·안전장치·감사 흐름을 검증한다.
 */

/** hub.* verification_status. */
export type VerificationStatus =
  | "pending"
  | "verified"
  | "rejected"
  | "needs_review"
  | "temporary";

/** hub.* 생명주기 status. */
export type MasterStatus = "active" | "merged" | "archived" | "deleted";

/** hub.startups 마스터 레코드. */
export interface StartupMaster {
  id: string;
  masterCode: string;
  name: string;
  legalName: string | null;
  normalizedName: string;
  businessNumber: string | null;
  corporationNumber: string | null;
  representativeName: string | null;
  phone: string | null;
  email: string | null;
  websiteUrl: string | null;
  address: string | null;
  industry: string | null;
  stage: string | null;
  sourceDomain: string | null;
  verificationStatus: VerificationStatus;
  status: MasterStatus;
  /** merged 된 경우 최종 마스터 id. */
  mergedIntoId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** hub.experts 마스터 레코드. (functional_spec §8) */
export interface ExpertMaster {
  id: string;
  masterCode: string;
  name: string;
  normalizedName: string;
  email: string | null;
  phone: string | null;
  organization: string | null;
  position: string | null;
  expertiseTags: string[];
  sourceDomain: string | null;
  verificationStatus: VerificationStatus;
  status: MasterStatus;
  mergedIntoId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** hub.partners 마스터 레코드. (functional_spec §9) */
export interface PartnerMaster {
  id: string;
  masterCode: string;
  name: string;
  normalizedName: string;
  partnerType: string | null;
  businessNumber: string | null;
  representativeName: string | null;
  phone: string | null;
  email: string | null;
  websiteUrl: string | null;
  address: string | null;
  sourceDomain: string | null;
  verificationStatus: VerificationStatus;
  status: MasterStatus;
  mergedIntoId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 검색/대시보드가 다루는 마스터의 최소 투영(엔티티 공통). */
export interface MasterSummary {
  id: string;
  entityType: EntityType;
  masterCode: string;
  name: string;
  normalizedName: string;
  verificationStatus: VerificationStatus;
  status: MasterStatus;
}

/** hub.master_identifiers.verified_status. */
export type IdentifierVerifiedStatus = "unverified" | "verified" | "rejected";

/** hub.master_identifiers. */
export interface MasterIdentifier {
  id: string;
  identifierType: string;
  identifierValue: string;
  normalizedValue: string;
  isPrimary: boolean;
  verifiedStatus: IdentifierVerifiedStatus;
  sourceDomain: string | null;
  createdAt: string;
}

/** hub.master_aliases. */
export interface MasterAlias {
  id: string;
  aliasType: string;
  aliasValue: string;
  normalizedValue: string;
  sourceDomain: string | null;
  createdAt: string;
}

/** hub.master_field_history. */
export interface FieldHistoryEntry {
  id: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  /** 변경 출처 도메인(hub/work/import 등). (data_model: master_field_history.source_domain) */
  sourceDomain: string | null;
  changeReason: string | null;
  changedBy: string | null;
  changedAt: string;
}

/** 상세의 중복 후보 요약(반대편 마스터 기준). */
export interface MergeCandidateSummary {
  id: string;
  otherId: string;
  otherMasterCode: string;
  otherName: string;
  score: number;
  reasons: string[];
  status: string;
}

/** hub.audit_logs 요약 항목. */
export interface AuditEntry {
  id: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string | null;
  reason: string | null;
  createdAt: string;
}

/** 스타트업 마스터 상세 화면 데이터. (functional_spec §7 섹션 구성) */
export interface StartupDetail {
  master: StartupMaster;
  identifiers: MasterIdentifier[];
  aliases: MasterAlias[];
  fieldHistory: FieldHistoryEntry[];
  mergeCandidates: MergeCandidateSummary[];
  auditSummary: AuditEntry[];
  /** 관련 업무 이력 요약(Work 등). 실제 집계는 도메인 앱 연결 후. */
  relatedWork: { label: string; count: number }[];
}

/** 전문가 마스터 상세 화면 데이터. (functional_spec §8 섹션 구성) */
export interface ExpertDetail {
  master: ExpertMaster;
  identifiers: MasterIdentifier[];
  aliases: MasterAlias[];
  fieldHistory: FieldHistoryEntry[];
  mergeCandidates: MergeCandidateSummary[];
  auditSummary: AuditEntry[];
  /** 관련 평가/멘토링 요약. 실제 집계는 Work 연결 후. */
  relatedWork: { label: string; count: number }[];
}

/** 협력사 마스터 상세 화면 데이터. (functional_spec §9 섹션 구성) */
export interface PartnerDetail {
  master: PartnerMaster;
  identifiers: MasterIdentifier[];
  aliases: MasterAlias[];
  fieldHistory: FieldHistoryEntry[];
  mergeCandidates: MergeCandidateSummary[];
  auditSummary: AuditEntry[];
  /** 관련 Project/Fund/M&A 요약. 실제 집계는 도메인 앱 연결 후. */
  relatedWork: { label: string; count: number }[];
}

/** Hub 대시보드 위젯 집계. (functional_spec §4) */
export interface DashboardCounts {
  startups: number;
  experts: number;
  partners: number;
  pendingMasters: number;
  pendingMergeCandidates: number;
}

/** 대시보드 최근 병합 이벤트. */
export interface RecentMergeEvent {
  id: string;
  entityType: EntityType;
  sourceName: string;
  targetId: string;
  targetName: string;
  syncStatus: string;
  createdAt: string;
}

/** 대시보드 최근 import batch. */
export interface RecentImportBatch {
  id: string;
  sourceName: string;
  entityType: EntityType;
  status: string;
  totalRows: number;
  processedRows: number;
  failedRows: number;
  startedAt: string;
}

/** 통합 검색 결과 항목. (functional_spec §5, api_contracts §6) */
export interface MasterSearchResult {
  id: string;
  entityType: EntityType;
  masterCode: string;
  name: string;
  verificationStatus: VerificationStatus;
  status: MasterStatus;
  matchedFields: string[];
  score: number;
}

/** 서버 액션 공통 결과. */
export interface ActionResult {
  ok: boolean;
  error?: string;
  /** 생성된 마스터의 id(신규 생성 시 상세로 이동). */
  createdId?: string;
  /** 민감 식별자 원본 조회 시 반환되는 원본값(reveal + audit). */
  value?: string;
}

/**
 * 임시 마스터 생성 입력(엔티티 공용). (근거: api_contracts §7)
 * 엔티티별로 쓰이는 필드가 다르며, 서버가 정규화·식별자 파생을 담당한다.
 */
export interface TemporaryMasterInput {
  name: string;
  legalName?: string | null;
  representativeName?: string | null;
  businessNumber?: string | null;
  phone?: string | null;
  email?: string | null;
  websiteUrl?: string | null;
  /** 협력사 기관유형. */
  partnerType?: string | null;
  /** 전문가 소속/직함/전문분야. */
  organization?: string | null;
  position?: string | null;
  expertiseTags?: string[];
  /** 유입 도메인(hub/work/fund 등). */
  sourceDomain: string;
  /** 유입 원본 레코드 id(work.applications.id 등). */
  sourceRecordId?: string | null;
  identifiers?: { identifierType: string; identifierValue: string }[];
  aliases?: { aliasType: string; aliasValue: string }[];
}

/** 임시 마스터 생성 결과(내부 표현). API 는 snake_case 로 투영한다. */
export interface TemporaryMasterResult {
  id: string;
  entityType: EntityType;
  masterCode: string;
  verificationStatus: VerificationStatus;
  status: MasterStatus;
  /** 생성 직후 자동 생성된 중복 후보 수. */
  mergeCandidateCount: number;
}

/** 마스터 검색 API 항목(내부 표현). API 는 snake_case + display_label 로 투영한다. */
export interface MasterSearchApiItem extends MasterSearchResult {
  /** "이름 / 대표자" 형태의 표시 라벨(엔티티별). */
  displayLabel: string;
}
