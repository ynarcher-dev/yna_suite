import { normalizeCompanyName, normalizeEmail, normalizePhone } from "@yna/utils";
import { seedExperts, seedPartners, seedStartups } from "./mock-seed-masters";
import type {
  AuditEntry,
  ExpertMaster,
  FieldHistoryEntry,
  MasterAlias,
  MasterIdentifier,
  PartnerMaster,
  RecentImportBatch,
  RecentMergeEvent,
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
  mergeEvents: RecentMergeEvent[];
  importBatches: RecentImportBatch[];
  audit: AuditEntry[];
  startupSeq: number;
  expertSeq: number;
  partnerSeq: number;
  auditSeq: number;
  idSeq: number;
}

export function seedState(): MockState {
  const identifiers: MockState["identifiers"] = [
    ident("id-1", "st-1", "business_number", "123-45-67890", "1234567890", true),
    ident("id-2", "st-1", "founder_phone", "010-1234-5678", "01012345678", false),
    ident("id-3", "st-1", "website_domain", "alpha.example", "alpha.example", false),
    ident("id-4", "st-2", "business_number", "223-34-45566", "2233445566", true),
    ident("id-5", "st-temp", "founder_phone", "010-1234-5678", "01012345678", true),
    ident("id-6", "ex-1", "email", "hong.mentor@expert.example", normalizeEmail("hong.mentor@expert.example"), true),
    ident("id-7", "ex-1", "phone", "010-2345-0001", normalizePhone("010-2345-0001"), false),
    ident("id-8", "ex-2", "email", "kim.pro@expert.example", normalizeEmail("kim.pro@expert.example"), true),
    ident("id-9", "pt-1", "business_number", "301-12-00123", "3011200123", true),
    ident("id-10", "pt-2", "business_number", "107-88-12345", "1078812345", true),
    ident("id-11", "pt-temp", "business_number", "107-88-12345", "1078812345", true),
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
    history("fh-1", "st-1", "name", "예비창업팀 알파", "알파테크", "법인 설립에 따른 사명 확정", "2026-04-01T05:00:00Z"),
    history("fh-2", "st-1", "legalName", null, "주식회사 알파테크", "법인 설립 정보 반영", "2026-04-01T05:00:00Z"),
    history("fh-3", "ex-1", "organization", "프리랜서", "알파벤처스", "소속 변경 확인", "2026-06-10T05:00:00Z"),
    history("fh-4", "pt-2", "name", "스마트 법률사무소", "스마트법무법인", "법인 전환에 따른 기관명 변경", "2026-05-15T05:00:00Z"),
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

  const mergeEvents: RecentMergeEvent[] = [
    {
      id: "me-1",
      entityType: "startup",
      sourceName: "알파테크(구)",
      targetId: "st-1",
      targetName: "알파테크",
      syncStatus: "completed",
      createdAt: "2026-06-18T05:00:00Z",
    },
  ];

  const importBatches: RecentImportBatch[] = [
    {
      id: "ib-1",
      sourceName: "2025_스타트업DB.xlsx",
      entityType: "startup",
      status: "completed",
      totalRows: 420,
      processedRows: 420,
      failedRows: 0,
      startedAt: "2026-06-15T01:00:00Z",
    },
    {
      id: "ib-2",
      sourceName: "협력사_명단.csv",
      entityType: "partner",
      status: "partial",
      totalRows: 60,
      processedRows: 54,
      failedRows: 6,
      startedAt: "2026-06-28T01:00:00Z",
    },
  ];

  const audit: AuditEntry[] = [
    auditRow("au-1", "관리자(개발)", "merge", "startup", "st-1", "동일 대표자 및 유사명 확인", "2026-06-18T05:00:00Z"),
    auditRow("au-2", "관리자(개발)", "update", "startup", "st-1", "법인 설립 정보 반영", "2026-04-01T05:00:00Z"),
    auditRow("au-3", "이심사", "create_temporary", "startup", "st-temp", "Work 신청 유입 임시 마스터", "2026-07-01T02:00:00Z"),
    auditRow("au-4", "관리자(개발)", "update", "expert", "ex-1", "소속 변경 확인", "2026-06-10T05:00:00Z"),
    auditRow("au-5", "관리자(개발)", "update", "partner", "pt-2", "법인 전환에 따른 기관명 변경", "2026-05-15T05:00:00Z"),
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
    audit,
    startupSeq: 92,
    expertSeq: 9,
    partnerSeq: 44,
    auditSeq: 100,
    idSeq: 100,
  };
}

function ident(
  id: string,
  entityId: string,
  identifierType: string,
  identifierValue: string,
  normalizedValue: string,
  isPrimary: boolean,
): MasterIdentifier & { entityId: string } {
  return {
    id,
    entityId,
    identifierType,
    identifierValue,
    normalizedValue,
    isPrimary,
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
  changeReason: string,
  changedAt: string,
): FieldHistoryEntry & { entityId: string } {
  return { id, entityId, fieldName, oldValue, newValue, changeReason, changedBy: "관리자(개발)", changedAt };
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
): AuditEntry {
  return { id, actorName, action, entityType, entityId, reason, createdAt };
}
