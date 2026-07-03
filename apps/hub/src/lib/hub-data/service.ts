import "server-only";
import type { EntityType } from "@yna/core";
import { isSupabaseConfigured } from "@/lib/auth/env";
import {
  mockDashboardCounts,
  mockGetStartupDetail,
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
import type {
  DashboardCounts,
  ExpertDetail,
  ExpertMaster,
  MasterSearchApiItem,
  MasterSearchResult,
  PartnerDetail,
  PartnerMaster,
  RecentImportBatch,
  RecentMergeEvent,
  StartupDetail,
  StartupMaster,
  TemporaryMasterInput,
  TemporaryMasterResult,
} from "./types";

/**
 * Hub 마스터 데이터 조회(서버 전용).
 * (근거: yna_suite_api_contracts.md §6~9, 4_memo 이슈17·19)
 *
 * - Supabase 미설정(로컬 dev 폴백): in-memory mock 으로 화면/배선을 검증한다.
 * - Supabase 설정(운영/스테이징): hub 스키마 조회로 대체(Docker/staging 에서 연결).
 */

function ensureFallback(): void {
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
