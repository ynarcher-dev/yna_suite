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

/** hub.audit_logs 항목. (data_model §12 — actor·domain·entity·action·before/after·reason·request_id) */
export interface AuditEntry {
  id: string;
  actorName: string;
  /** 액션이 발생한 서비스 도메인(hub 마스터 액션은 "hub"). */
  domainName: string;
  action: string;
  entityType: string;
  entityId: string | null;
  /** 변경 전/후 스냅샷. 개인정보 원문은 저장하지 않고 민감 필드는 마스킹한다(security §11). */
  before: unknown;
  after: unknown;
  reason: string | null;
  /** 동일 요청 상관관계 ID(req_<uuid>). */
  requestId: string;
  createdAt: string;
}

/** 감사 로그 조회 화면 항목(대상 마스터 라벨 포함). */
export interface AuditLogListItem extends AuditEntry {
  /** 대상 마스터 표시 라벨(masterCode 등). 조회 시 resolve. */
  entityLabel: string | null;
}

/** 감사 로그 조회 필터. (functional_spec §16 유형) */
export interface AuditLogFilter {
  q?: string;
  entityType?: string;
  action?: string;
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

/** 2단계 비동기 병합 반영 상태. (master_data_policy §10.3) */
export type MergeSyncStatus = "pending" | "completed" | "failed";

/** hub.merge_events 저장 레코드(대시보드 위젯은 RecentMergeEvent 로 투영). */
export interface MergeEventRow extends RecentMergeEvent {
  sourceId: string;
  reason: string | null;
  /** 비동기로 FK 를 갱신할 업무 레코드 수(현재 도메인 앱 미연결이라 0). */
  affectedCount: number;
}

/** 병합 후보 상태. (api_contracts §12) */
export type MergeCandidateStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "ignored"
  | "on_hold"
  | "expired";

/** 병합 후보에서 참조하는 마스터 요약. */
export interface MergeEntityRef {
  id: string;
  masterCode: string;
  name: string;
  verificationStatus: VerificationStatus;
  status: MasterStatus;
}

/** 병합 후보 목록 항목(source=소멸 예정, target=잔존). (api_contracts §12) */
export interface MergeCandidateListItem {
  id: string;
  entityType: EntityType;
  source: MergeEntityRef;
  target: MergeEntityRef;
  score: number;
  reasons: string[];
  status: MergeCandidateStatus;
  createdAt: string;
}

/** 좌우 비교용 마스터 스냅샷(필드 + 식별자 + 별칭 + 관련업무). */
export interface MergeEntitySnapshot {
  ref: MergeEntityRef;
  fields: { key: string; label: string; value: string | null; sensitive: boolean }[];
  identifiers: MasterIdentifier[];
  aliases: MasterAlias[];
  relatedWork: { label: string; count: number }[];
}

/** 병합 미리보기 필드별 대표값. (api_contracts §13 field_resolution) */
export interface MergeFieldResolutionRow {
  field: string;
  label: string;
  policy: string;
  source: string | null;
  target: string | null;
  selected: string | null;
}

/** 병합 미리보기 영향 업무 레코드. (api_contracts §13 affected_records) */
export interface MergeAffectedRecord {
  table: string;
  recordId: string;
  field: string;
  before: string;
  after: string;
}

/** 병합 미리보기 결과. (api_contracts §13) */
export interface MergePreview {
  sourceEntityId: string;
  targetEntityId: string;
  fieldResolution: MergeFieldResolutionRow[];
  affectedRecords: MergeAffectedRecord[];
  warnings: string[];
  /** 강한 식별자 충돌로 승인이 막히는지. */
  blocked: boolean;
}

/** 병합 후보 상세(좌우 비교 + 미리보기). (functional_spec §15) */
export interface MergeCandidateDetail {
  id: string;
  entityType: EntityType;
  score: number;
  reasons: string[];
  status: MergeCandidateStatus;
  createdAt: string;
  source: MergeEntitySnapshot;
  target: MergeEntitySnapshot;
  preview: MergePreview;
}

/** 병합 후보 목록 필터. */
export interface MergeCandidateFilter {
  entityType?: EntityType | "all";
  status?: MergeCandidateStatus | "all";
  minScore?: number;
}

/** 병합 승인 입력(필드 정책 override + 사유). */
export interface MergeApproveInput {
  /** 필드별 대표값 정책 override(미지정 필드는 기본 정책). */
  fieldPolicy?: Record<string, string>;
  reason: string;
}

/** 병합 승인 결과. */
export interface MergeApproveResult {
  ok: boolean;
  error?: string;
  /** 잔존(최종) 마스터 id — 승인 후 이동 대상. */
  targetId?: string;
  /** 생성된 merge_event id. */
  eventId?: string;
  /** 비동기 FK 반영 상태. */
  syncStatus?: MergeSyncStatus;
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

// ---- import(기존 DB 마이그레이션 도구). (근거: migration_strategy, functional_spec §14, data_model §11) ----

/** import 원본 유형. (data_model §11.1 source_type) */
export type ImportSourceType = "db" | "csv" | "xlsx" | "google_sheet" | "manual";

/** import batch 상태. (data_model §11.1 status + rollback=archived) */
export type ImportBatchStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "partial"
  | "archived";

/** import row 처리 상태. (data_model §11.2 import_status) */
export type ImportRowStatus = "pending" | "processed" | "failed" | "skipped";

/** import row 판정 결과. (migration_strategy §9) */
export type ImportDecisionKind = "connect" | "new_master" | "candidate" | "failed";

/** batch별 검증 리포트 요약. (migration_strategy §14, functional_spec §14) */
export interface ImportSummary {
  /** 신규(임시) 마스터 생성 수(후보 없이 생성). */
  newMasters: number;
  /** 기존 마스터 연결 수. */
  linkedMasters: number;
  /** 중복 후보와 함께 임시 생성된 마스터 수(운영자 검토 필요). */
  candidateMasters: number;
  /** 생성된 중복 후보 수. */
  mergeCandidates: number;
  /** 실패 row 수. */
  failedRows: number;
  /** 수동 검토 필요 row 수(candidateMasters 와 동일 기준). */
  needsReview: number;
}

/** staging.import_batches 레코드(대시보드 위젯은 RecentImportBatch 로 투영). */
export interface ImportBatch {
  id: string;
  sourceType: ImportSourceType;
  sourceName: string;
  entityType: EntityType;
  isDryRun: boolean;
  status: ImportBatchStatus;
  totalRows: number;
  processedRows: number;
  failedRows: number;
  summary: ImportSummary;
  startedBy: string | null;
  startedAt: string;
  finishedAt: string | null;
  archivedAt: string | null;
}

/** staging.startup_import_rows 레코드(화면 표시용). */
export interface ImportRow {
  id: string;
  sourceRowNumber: number | null;
  rawPayload: Record<string, unknown>;
  mappedPayload: Record<string, string> | null;
  normalizedPayload: Record<string, string | null> | null;
  importStatus: ImportRowStatus;
  decisionKind: ImportDecisionKind | null;
  errorMessage: string | null;
  hubEntityId: string | null;
  /** 연결/생성된 마스터 표시 라벨(masterCode·이름). 조회 시 resolve. */
  hubEntityLabel: string | null;
  createdAt: string;
  processedAt: string | null;
}

/** import batch 상세(요약 + row + 실패 사유 집계). (functional_spec §14) */
export interface ImportBatchDetail {
  batch: ImportBatch;
  rows: ImportRow[];
  /** 실패 사유별 건수(운영자 재처리 판단용). */
  failureReasons: { message: string; count: number }[];
}

/** dry-run 미리보기 행(운영 미반영). (migration_strategy §16) */
export interface ImportDryRunRow {
  sourceRowNumber: number | null;
  displayName: string;
  decisionKind: ImportDecisionKind;
  /** connect/candidate 대상 마스터 라벨. */
  targetLabel: string | null;
  score: number;
  errorMessage: string | null;
}

/** dry-run 리포트(운영 반영 전 검증). (migration_strategy §16) */
export interface ImportDryRunReport {
  totalRows: number;
  summary: ImportSummary;
  rows: ImportDryRunRow[];
}

/** import 실행/미리보기 입력. */
export interface ImportRunInput {
  sourceType: ImportSourceType;
  sourceName: string;
  rows: Record<string, unknown>[];
}

/** import 실행/rollback 결과. */
export interface ImportRunResult {
  ok: boolean;
  error?: string;
  batchId?: string;
  status?: ImportBatchStatus;
  summary?: ImportSummary;
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
