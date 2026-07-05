import type { EntityType } from "@yna/core";

/**
 * Mock Work 도메인 데이터 모델(Phase 1.13 Work 연결 Mock/Test Flow).
 * (근거: yna_suite_existing_source_alignment.md §3~6, yna_suite_api_contracts.md §19,
 *  yna_suite_phase1_scope.md §11)
 *
 * Program First 구조(program → module → activity → record)를 얇게 재현한다.
 * 실제 Work 앱은 Phase 2에서 붙으며(apps/work), Phase 1은 Hub 마스터·Dev 권한·병합 계약이
 * 도메인 앱을 받을 준비가 되었는지만 검증한다. 이 mock 은 production 에서 비활성화한다.
 */

/** Work 정형 모듈 종류. (existing_source_alignment §4) */
export const WORK_MODULE_TYPES = [
  "recruitment",
  "participant_management",
  "document_review",
  "onsite_evaluation",
  "orientation",
  "mentoring",
  "business_matching",
  "demo_day",
  "outcome_management",
  "custom_event",
] as const;
export type WorkModuleType = (typeof WORK_MODULE_TYPES)[number];

/** Activity 종류. custom_event 는 정형 모듈로 담기 어려운 운영 행사 확장 지점. */
export const WORK_ACTIVITY_TYPES = [
  "session",
  "custom_event",
  "meeting",
  "workshop",
] as const;
export type WorkActivityType = (typeof WORK_ACTIVITY_TYPES)[number];

export interface WorkProgram {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  createdBy: string;
  createdAt: string;
}

export interface WorkProgramModule {
  id: string;
  programId: string;
  moduleType: WorkModuleType;
  name: string;
  createdAt: string;
}

/**
 * 신청(참여자) 레코드. Hub 스타트업 마스터를 참조하되 직접 수정하지 않는다.
 * startupId 는 연결 당시의 마스터 id(병합 source 일 수 있음) — 병합 후에도 이 값은 바뀌지 않고,
 * 최종 마스터는 resolved view/helper(@yna/database resolveMasterId)로 실시간 resolve 한다(§10.3).
 */
export interface WorkApplication {
  id: string;
  programId: string;
  moduleId: string | null;
  /** 참여자 엔티티 종류(Phase 1 mock 은 startup 중심). */
  entityType: EntityType;
  /** 연결한 Hub 마스터 id(연결 시점 그대로 보존 — 병합 반영은 resolve 로). */
  startupId: string;
  applicantName: string;
  status: string;
  createdAt: string;
}

/** 신청 조회 결과(연결 id + 병합 반영 후 최종 마스터 id). */
export interface WorkApplicationView extends WorkApplication {
  /** resolveMasterId(startup) — 병합되면 target 으로 따라간다. */
  resolvedStartupId: string;
  resolvedMasterCode: string | null;
  resolvedMasterName: string | null;
  /** startupId 가 병합되어 다른 마스터로 귀속되었는지. */
  merged: boolean;
}

export interface WorkActivity {
  id: string;
  programId: string;
  moduleId: string | null;
  activityType: WorkActivityType;
  title: string;
  startsAt: string | null;
  createdAt: string;
}

export interface WorkMeetingMinutes {
  id: string;
  programId: string;
  moduleId: string | null;
  activityId: string | null;
  title: string;
  agenda: string | null;
  discussion: string | null;
  decisions: string | null;
  attachmentIds: string[];
  createdBy: string;
  createdAt: string;
}

// ---- inputs ----

export interface CreateProgramInput {
  name: string;
  startDate?: string | null;
  endDate?: string | null;
}

export interface CreateModuleInput {
  moduleType: WorkModuleType;
  name: string;
}

export interface CreateApplicationInput {
  programId: string;
  moduleId?: string | null;
  entityType?: EntityType;
  /** 연결할 Hub 마스터 id(검색 후 선택). */
  startupId: string;
  applicantName: string;
}

export interface CreateActivityInput {
  programId: string;
  moduleId?: string | null;
  activityType: WorkActivityType;
  title: string;
  startsAt?: string | null;
}

export interface CreateMeetingMinutesInput {
  programId: string;
  moduleId?: string | null;
  activityId?: string | null;
  title: string;
  agenda?: string | null;
  discussion?: string | null;
  decisions?: string | null;
  attachmentIds?: string[];
}

// ---- connection flow (자동 검증) ----

/** 연결 시나리오 단계 결과(화면·스크립트 공통 표현). */
export interface FlowStep {
  seq: number;
  label: string;
  ok: boolean;
  detail: string;
}

export interface FlowResult {
  ok: boolean;
  ranAt: string;
  actorName: string;
  steps: FlowStep[];
}
