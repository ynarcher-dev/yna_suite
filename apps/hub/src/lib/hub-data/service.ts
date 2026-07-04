import "server-only";
import type { EntityType } from "@yna/core";
import { isSupabaseConfigured } from "@/lib/auth/env";
import {
  mockDashboardCounts,
  mockGetStartupDetail,
  mockListAuditLogs,
  mockListStartups,
  mockRecentImportBatches,
  mockRecentMergeEvents,
  mockSearchApi,
  mockSearchMasters,
  type MasterEntity,
} from "./mock-store";
import {
  mockGetExpertDetail,
  mockGetPartnerDetail,
  mockListExperts,
  mockListPartners,
} from "./mock-masters";
import { mockCreateTemporaryMaster } from "./mock-temporary";
import {
  mockDryRunImport,
  mockGetImportBatchDetail,
  mockListImportBatches,
  mockRollbackImport,
  mockRunImport,
} from "./mock-import";
import {
  mockApproveMerge,
  mockGetMergeCandidateDetail,
  mockHoldMerge,
  mockIgnoreMerge,
  mockListMergeCandidates,
  mockPreviewMerge,
  mockRejectMerge,
} from "./mock-merge";
import type {
  AuditLogFilter,
  AuditLogListItem,
  DashboardCounts,
  ExpertDetail,
  ExpertMaster,
  ImportBatch,
  ImportBatchDetail,
  ImportDryRunReport,
  ImportRunInput,
  ImportRunResult,
  MasterSearchApiItem,
  MasterSearchResult,
  MergeApproveInput,
  MergeApproveResult,
  MergeCandidateDetail,
  MergeCandidateFilter,
  MergeCandidateListItem,
  MergePreview,
  PartnerDetail,
  PartnerMaster,
  RecentImportBatch,
  RecentMergeEvent,
  StartupDetail,
  StartupMaster,
  TemporaryMasterInput,
  TemporaryMasterListItem,
  TemporaryMasterResult,
} from "./types";

/**
 * Hub 마스터 데이터 조회(서버 전용).
 * (근거: yna_suite_api_contracts.md §6~9, 4_memo 이슈17·19)
 *
 * - Supabase 미설정(로컬 dev 폴백): in-memory mock 으로 화면/배선을 검증한다.
 * - Supabase 설정(운영/스테이징): hub 스키마 조회로 대체(Docker/staging 에서 연결).
 */

export function ensureFallback(): void {
  if (isSupabaseConfigured) {
    throw new Error(
      "Hub 마스터 조회의 Supabase 연동은 Docker/staging 환경에서 연결 예정입니다(4_memo 이슈21).",
    );
  }
}

export async function listStartups(): Promise<StartupMaster[]> {
  ensureFallback();
  return mockListStartups();
}

export async function getStartupDetail(id: string): Promise<StartupDetail | null> {
  ensureFallback();
  return mockGetStartupDetail(id);
}

export async function listExperts(): Promise<ExpertMaster[]> {
  ensureFallback();
  return mockListExperts();
}

export async function getExpertDetail(id: string): Promise<ExpertDetail | null> {
  ensureFallback();
  return mockGetExpertDetail(id);
}

export async function listPartners(): Promise<PartnerMaster[]> {
  ensureFallback();
  return mockListPartners();
}

export async function getPartnerDetail(id: string): Promise<PartnerDetail | null> {
  ensureFallback();
  return mockGetPartnerDetail(id);
}

/**
 * 임시 마스터(TEMP 코드, active) 엔티티 공통 목록. (functional_spec §14-1)
 * 기존 목록 조회 + pending 중복 후보 수 집계의 순수 조합이라 별도 store 코드가 없다.
 */
export async function listTemporaryMasters(): Promise<TemporaryMasterListItem[]> {
  ensureFallback();
  const [startups, experts, partners, candidates] = await Promise.all([
    mockListStartups(),
    mockListExperts(),
    mockListPartners(),
    mockListMergeCandidates({}),
  ]);
  const pendingCount = (entityType: EntityType, id: string): number =>
    candidates.filter(
      (c) =>
        c.entityType === entityType &&
        c.status === "pending" &&
        (c.source.id === id || c.target.id === id),
    ).length;
  const project = (
    entityType: EntityType,
    rows: Pick<
      StartupMaster,
      "id" | "masterCode" | "name" | "sourceDomain" | "status" | "createdAt"
    >[],
  ): TemporaryMasterListItem[] =>
    rows
      .filter((r) => r.masterCode.startsWith("TEMP-") && r.status === "active")
      .map((r) => ({
        id: r.id,
        entityType,
        masterCode: r.masterCode,
        name: r.name,
        sourceDomain: r.sourceDomain,
        pendingCandidateCount: pendingCount(entityType, r.id),
        createdAt: r.createdAt,
      }));
  return [
    ...project("startup", startups),
    ...project("expert", experts),
    ...project("partner", partners),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function searchMasters(args: {
  q: string;
  entityType: EntityType | "all";
  includeMerged: boolean;
}): Promise<MasterSearchResult[]> {
  ensureFallback();
  if (!args.q.trim()) return [];
  return mockSearchMasters(args.q, args.entityType, args.includeMerged);
}

/**
 * 마스터 검색(공통 계약). 단일 entity_type·매칭 필드·점수·표시 라벨을 낸다.
 * (근거: api_contracts §6 — 모든 도메인 앱이 재사용)
 */
export async function searchMasterCandidates(args: {
  entityType: MasterEntity;
  q: string;
  limit: number;
  includeMerged: boolean;
}): Promise<MasterSearchApiItem[]> {
  ensureFallback();
  if (!args.q.trim()) return [];
  return mockSearchApi(args.entityType, args.q, args.includeMerged, args.limit);
}

/**
 * 임시 마스터 생성(공통 계약). validation→normalized→TEMP 생성→식별자/별칭→중복 후보→audit.
 * (근거: api_contracts §7, master_data_policy §7~9)
 */
export async function createTemporaryMaster(
  entityType: MasterEntity,
  input: TemporaryMasterInput,
  actorName: string,
): Promise<TemporaryMasterResult> {
  ensureFallback();
  return mockCreateTemporaryMaster(entityType, input, actorName);
}

export async function getDashboardCounts(): Promise<DashboardCounts> {
  ensureFallback();
  return mockDashboardCounts();
}

export async function getRecentMergeEvents(): Promise<RecentMergeEvent[]> {
  ensureFallback();
  return mockRecentMergeEvents();
}

export async function getRecentImportBatches(): Promise<RecentImportBatch[]> {
  ensureFallback();
  return mockRecentImportBatches();
}

/**
 * 중복 후보 조회/병합(공통 계약). (근거: api_contracts §12~15, master_data_policy §10·13~15)
 * 병합 승인은 정책 §10.3 혼합형 — 1단계 동기 커밋 + 2단계 비동기 FK 반영.
 */
export async function listMergeCandidates(
  filter: MergeCandidateFilter,
): Promise<MergeCandidateListItem[]> {
  ensureFallback();
  return mockListMergeCandidates(filter);
}

export async function getMergeCandidateDetail(id: string): Promise<MergeCandidateDetail | null> {
  ensureFallback();
  return mockGetMergeCandidateDetail(id);
}

export async function previewMerge(
  id: string,
  fieldPolicy?: Record<string, string>,
): Promise<MergePreview | null> {
  ensureFallback();
  return mockPreviewMerge(id, fieldPolicy);
}

export async function approveMerge(
  id: string,
  input: MergeApproveInput,
  actorName: string,
): Promise<MergeApproveResult> {
  ensureFallback();
  return mockApproveMerge(id, input, actorName);
}

export async function rejectMerge(
  id: string,
  reason: string,
  actorName: string,
): Promise<MergeApproveResult> {
  ensureFallback();
  return mockRejectMerge(id, reason, actorName);
}

export async function ignoreMerge(
  id: string,
  reason: string,
  actorName: string,
): Promise<MergeApproveResult> {
  ensureFallback();
  return mockIgnoreMerge(id, reason, actorName);
}

export async function holdMerge(
  id: string,
  reason: string,
  actorName: string,
): Promise<MergeApproveResult> {
  ensureFallback();
  return mockHoldMerge(id, reason, actorName);
}

/** 공통 감사 로그 조회(전 엔티티, 최신순). 로그는 수정/삭제 불가. (api_contracts §5, data_model §12) */
export async function listAuditLogs(filter: AuditLogFilter = {}): Promise<AuditLogListItem[]> {
  ensureFallback();
  return mockListAuditLogs(filter);
}

/**
 * 기존 스타트업 DB 이관 도구. (근거: migration_strategy, functional_spec §14, data_model §11)
 * dry-run(운영 미반영) → run(실제 이관) → rollback(batch 단위 비활성화). staging 적재는 Docker 연결 시.
 */
export async function listImportBatches(): Promise<ImportBatch[]> {
  ensureFallback();
  return mockListImportBatches();
}

export async function getImportBatchDetail(id: string): Promise<ImportBatchDetail | null> {
  ensureFallback();
  return mockGetImportBatchDetail(id);
}

export async function dryRunImport(input: ImportRunInput): Promise<ImportDryRunReport> {
  ensureFallback();
  return mockDryRunImport(input);
}

export async function runImport(input: ImportRunInput, actorName: string): Promise<ImportRunResult> {
  ensureFallback();
  return mockRunImport(input, actorName);
}

export async function rollbackImport(id: string, actorName: string): Promise<ImportRunResult> {
  ensureFallback();
  return mockRollbackImport(id, actorName);
}
