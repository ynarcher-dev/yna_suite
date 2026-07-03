import { normalizeCompanyName } from "@yna/utils";
import type {
  AuditEntry,
  FieldHistoryEntry,
  MasterAlias,
  MasterIdentifier,
  RecentImportBatch,
  RecentMergeEvent,
  SimpleMaster,
  StartupMaster,
} from "./types";

/**
 * Hub 마스터 mock 시드. (근거: 4_memo 이슈17·19 — Docker 미설치로 실제 hub 스키마 불가)
 * globalThis 캐시에 담아 dev 서버 프로세스 내에서 화면·배선을 검증한다.
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
  experts: SimpleMaster[];
  partners: SimpleMaster[];
  identifiers: (MasterIdentifier & { entityId: string })[];
  aliases: (MasterAlias & { entityId: string })[];
  fieldHistory: (FieldHistoryEntry & { entityId: string })[];
  mergeCandidates: MergeCandidateRow[];
  mergeEvents: RecentMergeEvent[];
  importBatches: RecentImportBatch[];
  audit: AuditEntry[];
  startupSeq: number;
  auditSeq: number;
  idSeq: number;
}

function startup(
  partial: Omit<StartupMaster, "normalizedName" | "corporationNumber"> &
    Partial<Pick<StartupMaster, "corporationNumber">>,
): StartupMaster {
  return {
    corporationNumber: null,
    ...partial,
    normalizedName: normalizeCompanyName(partial.name),
  };
}

function simple(
  id: string,
  entityType: "expert" | "partner",
  masterCode: string,
  name: string,
  verificationStatus: SimpleMaster["verificationStatus"],
  status: SimpleMaster["status"] = "active",
): SimpleMaster {
  return {
    id,
    entityType,
    masterCode,
    name,
    normalizedName: normalizeCompanyName(name),
    verificationStatus,
    status,
  };
}

export function seedState(): MockState {
  const startups: StartupMaster[] = [
    startup({
      id: "st-1",
      masterCode: "YNA-ST-2026-0001",
      name: "알파테크",
      legalName: "주식회사 알파테크",
      businessNumber: "1234567890",
      corporationNumber: "110111-1234567",
      representativeName: "홍길동",
      phone: "01012345678",
      email: "contact@alpha.example",
      websiteUrl: "https://alpha.example",
      address: "서울특별시 강남구 테헤란로 1",
      industry: "SaaS",
      stage: "Series A",
      sourceDomain: "work",
      verificationStatus: "verified",
      status: "active",
      mergedIntoId: null,
      createdAt: "2026-03-01T02:00:00Z",
      updatedAt: "2026-06-20T05:00:00Z",
    }),
    startup({
      id: "st-2",
      masterCode: "YNA-ST-2026-0002",
      name: "베타솔루션",
      legalName: "베타솔루션 주식회사",
      businessNumber: "2233445566",
      corporationNumber: null,
      representativeName: "김영희",
      phone: "01033334444",
      email: "hello@beta.example",
      websiteUrl: null,
      address: "부산광역시 해운대구 센텀로 99",
      industry: "물류",
      stage: "Seed",
      sourceDomain: "fund",
      verificationStatus: "verified",
      status: "active",
      mergedIntoId: null,
      createdAt: "2026-03-05T02:00:00Z",
      updatedAt: "2026-05-01T05:00:00Z",
    }),
    startup({
      id: "st-3",
      masterCode: "YNA-ST-2026-0003",
      name: "감마랩스",
      legalName: null,
      businessNumber: null,
      representativeName: "이철수",
      phone: "01055556666",
      email: null,
      websiteUrl: "https://gamma.example",
      address: null,
      industry: "바이오",
      stage: "예비창업",
      sourceDomain: "work",
      verificationStatus: "needs_review",
      status: "active",
      mergedIntoId: null,
      createdAt: "2026-04-10T02:00:00Z",
      updatedAt: "2026-04-10T02:00:00Z",
    }),
    startup({
      id: "st-4",
      masterCode: "YNA-ST-2026-0004",
      name: "델타모빌리티",
      legalName: "델타모빌리티 주식회사",
      businessNumber: "5566778899",
      representativeName: "박민수",
      phone: "01077778888",
      email: "info@delta.example",
      websiteUrl: null,
      address: "대전광역시 유성구 대학로 291",
      industry: "모빌리티",
      stage: "Series B",
      sourceDomain: "mna",
      verificationStatus: "verified",
      status: "active",
      mergedIntoId: null,
      createdAt: "2026-02-01T02:00:00Z",
      updatedAt: "2026-06-01T05:00:00Z",
    }),
    startup({
      id: "st-old",
      masterCode: "YNA-ST-2026-0009",
      name: "알파테크(구)",
      legalName: null,
      businessNumber: null,
      representativeName: "홍길동",
      phone: "01012345678",
      email: null,
      websiteUrl: null,
      address: null,
      industry: null,
      stage: null,
      sourceDomain: "work",
      verificationStatus: "verified",
      status: "merged",
      mergedIntoId: "st-1",
      createdAt: "2026-01-15T02:00:00Z",
      updatedAt: "2026-06-18T05:00:00Z",
    }),
    startup({
      id: "st-temp",
      masterCode: "TEMP-ST-2026-0092",
      name: "알파",
      legalName: null,
      businessNumber: null,
      representativeName: "홍길동",
      phone: "01012345678",
      email: "hong@alpha.example",
      websiteUrl: null,
      address: null,
      industry: null,
      stage: "예비창업",
      sourceDomain: "work",
      verificationStatus: "temporary",
      status: "active",
      mergedIntoId: null,
      createdAt: "2026-07-01T02:00:00Z",
      updatedAt: "2026-07-01T02:00:00Z",
    }),
  ];

  const experts: SimpleMaster[] = [
    simple("ex-1", "expert", "YNA-EX-2026-0001", "홍멘토", "verified"),
    simple("ex-2", "expert", "YNA-EX-2026-0002", "김전문", "verified"),
    simple("ex-9", "expert", "YNA-EX-2026-0009", "이심사", "pending"),
  ];

  const partners: SimpleMaster[] = [
    simple("pt-1", "partner", "YNA-PT-2026-0001", "한국벤처투자", "verified"),
    simple("pt-2", "partner", "YNA-PT-2026-0002", "스마트법무법인", "verified"),
    simple("pt-3", "partner", "YNA-PT-2026-0003", "창업진흥원", "needs_review"),
  ];

  const identifiers: MockState["identifiers"] = [
    ident("id-1", "st-1", "business_number", "123-45-67890", "1234567890", true),
    ident("id-2", "st-1", "founder_phone", "010-1234-5678", "01012345678", false),
    ident("id-3", "st-1", "website_domain", "alpha.example", "alpha.example", false),
    ident("id-4", "st-2", "business_number", "223-34-45566", "2233445566", true),
    ident("id-5", "st-temp", "founder_phone", "010-1234-5678", "01012345678", true),
  ];

  const aliases: MockState["aliases"] = [
    alias("al-1", "st-1", "previous_name", "예비창업팀 알파"),
    alias("al-2", "st-1", "short_name", "알파"),
    alias("al-3", "st-4", "brand_name", "델타"),
  ];

  const fieldHistory: MockState["fieldHistory"] = [
    {
      id: "fh-1",
      entityId: "st-1",
      fieldName: "name",
      oldValue: "예비창업팀 알파",
      newValue: "알파테크",
      changeReason: "법인 설립에 따른 사명 확정",
      changedBy: "관리자(개발)",
      changedAt: "2026-04-01T05:00:00Z",
    },
    {
      id: "fh-2",
      entityId: "st-1",
      fieldName: "legalName",
      oldValue: null,
      newValue: "주식회사 알파테크",
      changeReason: "법인 설립 정보 반영",
      changedBy: "관리자(개발)",
      changedAt: "2026-04-01T05:00:00Z",
    },
  ];

  const mergeCandidates: MergeCandidateRow[] = [
    {
      id: "mc-1",
      entityType: "startup",
      sourceId: "st-temp",
      targetId: "st-1",
      score: 86,
      reasons: ["normalized_name_similar", "representative_name_match", "founder_phone_match"],
      status: "pending",
      createdAt: "2026-07-01T02:05:00Z",
    },
    {
      id: "mc-2",
      entityType: "startup",
      sourceId: "st-3",
      targetId: "st-4",
      score: 62,
      reasons: ["normalized_name_similar"],
      status: "rejected",
      createdAt: "2026-05-02T02:05:00Z",
    },
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
    {
      id: "au-1",
      actorName: "관리자(개발)",
      action: "merge",
      entityType: "startup",
      entityId: "st-1",
      reason: "동일 대표자 및 유사명 확인",
      createdAt: "2026-06-18T05:00:00Z",
    },
    {
      id: "au-2",
      actorName: "관리자(개발)",
      action: "update",
      entityType: "startup",
      entityId: "st-1",
      reason: "법인 설립 정보 반영",
      createdAt: "2026-04-01T05:00:00Z",
    },
    {
      id: "au-3",
      actorName: "이심사",
      action: "create_temporary",
      entityType: "startup",
      entityId: "st-temp",
      reason: "Work 신청 유입 임시 마스터",
      createdAt: "2026-07-01T02:00:00Z",
    },
  ];

  return {
    startups,
    experts,
    partners,
    identifiers,
    aliases,
    fieldHistory,
    mergeCandidates,
    mergeEvents,
    importBatches,
    audit,
    startupSeq: 92,
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
