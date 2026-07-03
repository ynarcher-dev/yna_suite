import { normalizeCompanyName, normalizeEmail, normalizePhone } from "@yna/utils";
import { seedExperts, seedPartners, seedStartups } from "./mock-seed-masters";
import type {
  AuditEntry,
  ExpertMaster,
  FieldHistoryEntry,
  ImportBatch,
  ImportRow,
  ImportSummary,
  MasterAlias,
  MasterIdentifier,
  MergeEventRow,
  PartnerMaster,
  StartupMaster,
} from "./types";

/**
 * Hub 마스터 mock 시드 조립. (근거: 4_memo 이슈17·19·21 — Docker 미설치로 실제 hub 스키마 불가)
 * globalThis 캐시에 담아 dev 서버 프로세스 내에서 화면·배선을 검증한다.
 * 마스터 원장 레코드는 mock-seed-masters.ts, 부속 테이블(식별자/별칭/이력/중복후보/감사)은 여기서 둔다.
 * Supabase 가 설정되면 사용되지 않으며 운영/스테이징에는 노출되지 않는다.
 */

export interface MergeCandidateRow {
  id: string;
  entityType: "startup" | "expert" | "partner";
  sourceId: string;
  targetId: string;
  score: number;
  reasons: string[];
  status: string;
  createdAt: string;
}

export interface MockState {
  startups: StartupMaster[];
  experts: ExpertMaster[];
  partners: PartnerMaster[];
  identifiers: (MasterIdentifier & { entityId: string })[];
  aliases: (MasterAlias & { entityId: string })[];
  fieldHistory: (FieldHistoryEntry & { entityId: string })[];
  mergeCandidates: MergeCandidateRow[];
  mergeEvents: MergeEventRow[];
  importBatches: ImportBatch[];
  importRows: (ImportRow & { batchId: string })[];
  audit: AuditEntry[];
  startupSeq: number;
  expertSeq: number;
  partnerSeq: number;
  auditSeq: number;
  mergeSeq: number;
  importSeq: number;
  idSeq: number;
}

export function seedState(): MockState {
  const identifiers: MockState["identifiers"] = [
    ident("id-1", "st-1", "business_number", "123-45-67890", "1234567890", true, "verified"),
    ident("id-2", "st-1", "founder_phone", "010-1234-5678", "01012345678", true, "verified"),
    ident("id-3", "st-1", "website_domain", "alpha.example", "alpha.example", false, "unverified"),
    ident("id-4", "st-2", "business_number", "223-34-45566", "2233445566", true, "verified"),
    ident("id-5", "st-temp", "founder_phone", "010-1234-5678", "01012345678", true, "unverified"),
    ident("id-6", "ex-1", "email", "hong.mentor@expert.example", normalizeEmail("hong.mentor@expert.example"), true, "verified"),
    ident("id-7", "ex-1", "phone", "010-2345-0001", normalizePhone("010-2345-0001"), false, "unverified"),
    ident("id-8", "ex-2", "email", "kim.pro@expert.example", normalizeEmail("kim.pro@expert.example"), true, "unverified"),
    ident("id-9", "pt-1", "business_number", "301-12-00123", "3011200123", true, "verified"),
    ident("id-10", "pt-2", "business_number", "107-88-12345", "1078812345", true, "verified"),
    ident("id-11", "pt-temp", "business_number", "107-88-12345", "1078812345", true, "unverified"),
  ];

  const aliases: MockState["aliases"] = [
    alias("al-1", "st-1", "previous_name", "예비창업팀 알파"),
    alias("al-2", "st-1", "short_name", "알파"),
    alias("al-3", "st-4", "brand_name", "델타"),
    alias("al-4", "ex-1", "english_name", "Hong Mentor"),
    alias("al-5", "pt-1", "short_name", "한벤투"),
    alias("al-6", "pt-2", "previous_name", "스마트 법률사무소"),
  ];

  const fieldHistory: MockState["fieldHistory"] = [
    history("fh-1", "st-1", "name", "예비창업팀 알파", "알파테크", "hub", "법인 설립에 따른 사명 확정", "2026-04-01T05:00:00Z"),
    history("fh-2", "st-1", "legalName", null, "주식회사 알파테크", "hub", "법인 설립 정보 반영", "2026-04-01T05:00:00Z"),
    history("fh-3", "ex-1", "organization", "프리랜서", "알파벤처스", "work", "소속 변경 확인", "2026-06-10T05:00:00Z"),
    history("fh-4", "pt-2", "name", "스마트 법률사무소", "스마트법무법인", "hub", "법인 전환에 따른 기관명 변경", "2026-05-15T05:00:00Z"),
  ];

  const mergeCandidates: MergeCandidateRow[] = [
    candidate("mc-1", "startup", "st-temp", "st-1", 86, [
      "normalized_name_similar",
      "representative_name_match",
      "founder_phone_match",
    ], "pending", "2026-07-01T02:05:00Z"),
    candidate("mc-2", "startup", "st-3", "st-4", 62, ["normalized_name_similar"], "rejected", "2026-05-02T02:05:00Z"),
    candidate("mc-3", "partner", "pt-temp", "pt-2", 96, [
      "business_number_match",
      "representative_name_match",
    ], "pending", "2026-06-29T02:05:00Z"),
  ];

  const mergeEvents: MergeEventRow[] = [
    {
      id: "me-1",
      entityType: "startup",
      sourceId: "st-old",
      sourceName: "알파테크(구)",
      targetId: "st-1",
      targetName: "알파테크",
      syncStatus: "completed",
      reason: "동일 대표자 및 유사명 확인",
      affectedCount: 0,
      createdAt: "2026-06-18T05:00:00Z",
    },
  ];

  const importBatches: ImportBatch[] = [
    {
      id: "ib-1",
      sourceType: "xlsx",
      sourceName: "2025_스타트업DB.xlsx",
      entityType: "startup",
      isDryRun: false,
      status: "completed",
      totalRows: 420,
      processedRows: 420,
      failedRows: 0,
      summary: summary({ newMasters: 372, linkedMasters: 31, candidateMasters: 17, mergeCandidates: 21 }),
      startedBy: "관리자(개발)",
      startedAt: "2026-06-15T01:00:00Z",
      finishedAt: "2026-06-15T01:04:00Z",
      archivedAt: null,
    },
    {
      id: "ib-2",
      sourceType: "csv",
      sourceName: "2025_상반기_추가유입.csv",
      entityType: "startup",
      isDryRun: false,
      status: "partial",
      totalRows: 60,
      processedRows: 54,
      failedRows: 6,
      summary: summary({ newMasters: 41, linkedMasters: 8, candidateMasters: 5, mergeCandidates: 7, failedRows: 6, needsReview: 5 }),
      startedBy: "관리자(개발)",
      startedAt: "2026-06-28T01:00:00Z",
      finishedAt: "2026-06-28T01:02:00Z",
      archivedAt: null,
    },
  ];

  const importRows: (ImportRow & { batchId: string })[] = [
    importRow("ir-1", "ib-2", 12, { 회사명: "제타모빌리티", 대표자: "장민수", 사업자번호: "" }, "new_master", "processed", "st-91", "TEMP-ST-2026-0091 · 제타모빌리티"),
    importRow("ir-2", "ib-2", 27, { 회사명: "알파테크", 대표자: "홍길동", 연락처: "010-1234-5678" }, "candidate", "processed", "st-92", "TEMP-ST-2026-0092 · 알파테크"),
    importRow("ir-3", "ib-2", 31, { 회사명: "델타", 사업자번호: "445-66-77889" }, "connect", "processed", "st-4", "YNA-ST-2026-0004 · 델타로보틱스"),
    importRow("ir-4", "ib-2", 44, { 회사명: "", 대표자: "김대표", 연락처: "02-000-0000" }, "failed", "failed", null, null, "회사명(name) 또는 팀명(team_name)이 필요합니다."),
    importRow("ir-5", "ib-2", 45, { 회사명: "노이즈로보틱스", 사업자번호: "12-345" }, "failed", "failed", null, null, "사업자번호 형식이 올바르지 않습니다(숫자 10자리)."),
  ];

  const audit: AuditEntry[] = [
    auditRow("au-1", "관리자(개발)", "merge", "startup", "st-1", "동일 대표자 및 유사명 확인", "2026-06-18T05:00:00Z", {
      before: { masterCode: "ST-0001" },
      after: { absorbed: "ST-0007", syncStatus: "completed" },
    }),
    auditRow("au-2", "관리자(개발)", "update", "startup", "st-1", "법인 설립 정보 반영", "2026-04-01T05:00:00Z", {
      before: { legalName: null, businessNumber: null },
      after: { legalName: "알파테크 주식회사", businessNumber: "123-**-*****" },
    }),
    auditRow("au-3", "이심사", "create_temporary", "startup", "st-temp", "Work 신청 유입 임시 마스터", "2026-07-01T02:00:00Z"),
    auditRow("au-4", "관리자(개발)", "update", "expert", "ex-1", "소속 변경 확인", "2026-06-10T05:00:00Z", {
      before: { organization: "베타벤처스" },
      after: { organization: "감마파트너스" },
    }),
    auditRow("au-5", "관리자(개발)", "update", "partner", "pt-2", "법인 전환에 따른 기관명 변경", "2026-05-15T05:00:00Z", {
      before: { name: "델타자문" },
      after: { name: "델타자문 주식회사" },
    }),
  ];

  return {
    startups: seedStartups(),
    experts: seedExperts(),
    partners: seedPartners(),
    identifiers,
    aliases,
    fieldHistory,
    mergeCandidates,
    mergeEvents,
    importBatches,
    importRows,
    audit,
    startupSeq: 92,
    expertSeq: 9,
    partnerSeq: 44,
    auditSeq: 100,
    mergeSeq: 1,
    importSeq: 2,
    idSeq: 100,
  };
}

/** 검증 리포트 요약(누락 필드 0 채움). needsReview 미지정 시 candidateMasters 로 맞춘다. */
function summary(partial: Partial<ImportSummary>): ImportSummary {
  const candidateMasters = partial.candidateMasters ?? 0;
  return {
    newMasters: partial.newMasters ?? 0,
    linkedMasters: partial.linkedMasters ?? 0,
    candidateMasters,
    mergeCandidates: partial.mergeCandidates ?? 0,
    failedRows: partial.failedRows ?? 0,
    needsReview: partial.needsReview ?? candidateMasters,
  };
}

function importRow(
  id: string,
  batchId: string,
  sourceRowNumber: number,
  raw: Record<string, unknown>,
  decisionKind: ImportRow["decisionKind"],
  importStatus: ImportRow["importStatus"],
  hubEntityId: string | null,
  hubEntityLabel: string | null,
  errorMessage: string | null = null,
): ImportRow & { batchId: string } {
  return {
    id,
    batchId,
    sourceRowNumber,
    rawPayload: raw,
    mappedPayload: null,
    normalizedPayload: null,
    importStatus,
    decisionKind,
    errorMessage,
    hubEntityId,
    hubEntityLabel,
    createdAt: "2026-06-28T01:00:00Z",
    processedAt: importStatus === "failed" ? null : "2026-06-28T01:01:30Z",
  };
}

function ident(
  id: string,
  entityId: string,
  identifierType: string,
  identifierValue: string,
  normalizedValue: string,
  isPrimary: boolean,
  verifiedStatus: MasterIdentifier["verifiedStatus"],
): MasterIdentifier & { entityId: string } {
  return {
    id,
    entityId,
    identifierType,
    identifierValue,
    normalizedValue,
    isPrimary,
    verifiedStatus,
    sourceDomain: "hub",
    createdAt: "2026-04-01T05:00:00Z",
  };
}

function alias(
  id: string,
  entityId: string,
  aliasType: string,
  aliasValue: string,
): MasterAlias & { entityId: string } {
  return {
    id,
    entityId,
    aliasType,
    aliasValue,
    normalizedValue: normalizeCompanyName(aliasValue),
    sourceDomain: "hub",
    createdAt: "2026-04-01T05:00:00Z",
  };
}

function history(
  id: string,
  entityId: string,
  fieldName: string,
  oldValue: string | null,
  newValue: string | null,
  sourceDomain: string,
  changeReason: string,
  changedAt: string,
): FieldHistoryEntry & { entityId: string } {
  return { id, entityId, fieldName, oldValue, newValue, sourceDomain, changeReason, changedBy: "관리자(개발)", changedAt };
}

function candidate(
  id: string,
  entityType: MergeCandidateRow["entityType"],
  sourceId: string,
  targetId: string,
  score: number,
  reasons: string[],
  status: string,
  createdAt: string,
): MergeCandidateRow {
  return { id, entityType, sourceId, targetId, score, reasons, status, createdAt };
}

function auditRow(
  id: string,
  actorName: string,
  action: string,
  entityType: string,
  entityId: string,
  reason: string,
  createdAt: string,
  extra?: { before?: unknown; after?: unknown },
): AuditEntry {
  return {
    id,
    actorName,
    domainName: "hub",
    action,
    entityType,
    entityId,
    before: extra?.before ?? null,
    after: extra?.after ?? null,
    reason,
    requestId: `req_seed-${id}`,
    createdAt,
  };
}
