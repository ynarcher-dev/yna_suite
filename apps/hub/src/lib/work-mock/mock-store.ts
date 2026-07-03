import type { EntityType } from "@yna/core";
import { resolveMasterId } from "@yna/database";
import { store as hubStore, type MasterEntity } from "../hub-data/mock-store";
import type {
  CreateActivityInput,
  CreateApplicationInput,
  CreateMeetingMinutesInput,
  CreateModuleInput,
  CreateProgramInput,
  FlowResult,
  WorkActivity,
  WorkApplication,
  WorkApplicationView,
  WorkMeetingMinutes,
  WorkProgram,
  WorkProgramModule,
} from "./types";

/**
 * Mock Work 도메인 in-memory 스토어(Phase 1.13).
 * (근거: yna_suite_api_contracts.md §19, yna_suite_phase1_scope.md §11)
 *
 * Hub 마스터를 참조만 하고 직접 수정하지 않는다. 신청 FK 는 연결 당시 값을 보존하며,
 * 최종 마스터는 hub 마스터의 merged_into_id 를 resolve 해서(§10.3) 실시간으로 따라간다.
 * 실제 Work 앱(Phase 2)이 붙으면 이 스토어는 work 스키마 조회로 교체된다.
 */

interface WorkMockState {
  programs: WorkProgram[];
  modules: WorkProgramModule[];
  applications: WorkApplication[];
  activities: WorkActivity[];
  minutes: WorkMeetingMinutes[];
  idSeq: number;
  /** 연결 테스트 실행마다 증가(고유 식별자 파생용). */
  runSeq: number;
  /** 최근 연결 테스트 결과(도메인 연결 테스트 화면 표시용). */
  lastFlow: FlowResult | null;
}

const g = globalThis as unknown as { __ynaWorkMock?: WorkMockState };

export function workStore(): WorkMockState {
  if (!g.__ynaWorkMock) {
    g.__ynaWorkMock = {
      programs: [],
      modules: [],
      applications: [],
      activities: [],
      minutes: [],
      idSeq: 0,
      runSeq: 0,
      lastFlow: null,
    };
  }
  return g.__ynaWorkMock;
}

function now(): string {
  return new Date().toISOString();
}

/** 연결 테스트 회차 고유 시퀀스(식별자 충돌 방지용). */
export function nextRunSeq(): number {
  return ++workStore().runSeq;
}

// ---- writes ----

export function createProgram(input: CreateProgramInput, actorName: string): WorkProgram {
  const s = workStore();
  const program: WorkProgram = {
    id: `wp-${++s.idSeq}`,
    name: input.name,
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
    createdBy: actorName,
    createdAt: now(),
  };
  s.programs.push(program);
  return program;
}

export function createModule(programId: string, input: CreateModuleInput): WorkProgramModule {
  const s = workStore();
  if (!s.programs.some((p) => p.id === programId)) {
    throw new Error("프로그램을 찾을 수 없습니다.");
  }
  const mod: WorkProgramModule = {
    id: `wm-${++s.idSeq}`,
    programId,
    moduleType: input.moduleType,
    name: input.name,
    createdAt: now(),
  };
  s.modules.push(mod);
  return mod;
}

export function createApplication(input: CreateApplicationInput): WorkApplication {
  const s = workStore();
  if (!s.programs.some((p) => p.id === input.programId)) {
    throw new Error("프로그램을 찾을 수 없습니다.");
  }
  const entityType: EntityType = input.entityType ?? "startup";
  // Hub 마스터가 실제로 존재하는지 확인만 한다(직접 수정 금지).
  if (!findHubMaster(entityType, input.startupId)) {
    throw new Error("연결할 Hub 마스터를 찾을 수 없습니다.");
  }
  const app: WorkApplication = {
    id: `wa-${++s.idSeq}`,
    programId: input.programId,
    moduleId: input.moduleId ?? null,
    entityType,
    startupId: input.startupId,
    applicantName: input.applicantName,
    status: "submitted",
    createdAt: now(),
  };
  s.applications.push(app);
  return app;
}

export function createActivity(input: CreateActivityInput): WorkActivity {
  const s = workStore();
  if (!s.programs.some((p) => p.id === input.programId)) {
    throw new Error("프로그램을 찾을 수 없습니다.");
  }
  const activity: WorkActivity = {
    id: `wac-${++s.idSeq}`,
    programId: input.programId,
    moduleId: input.moduleId ?? null,
    activityType: input.activityType,
    title: input.title,
    startsAt: input.startsAt ?? null,
    createdAt: now(),
  };
  s.activities.push(activity);
  return activity;
}

export function createMeetingMinutes(input: CreateMeetingMinutesInput): WorkMeetingMinutes {
  const s = workStore();
  if (!s.programs.some((p) => p.id === input.programId)) {
    throw new Error("프로그램을 찾을 수 없습니다.");
  }
  const minutes: WorkMeetingMinutes = {
    id: `wmm-${++s.idSeq}`,
    programId: input.programId,
    moduleId: input.moduleId ?? null,
    activityId: input.activityId ?? null,
    title: input.title,
    agenda: input.agenda ?? null,
    discussion: input.discussion ?? null,
    decisions: input.decisions ?? null,
    attachmentIds: input.attachmentIds ?? [],
    createdBy: "system",
    createdAt: now(),
  };
  s.minutes.push(minutes);
  return minutes;
}

export function setLastFlow(result: FlowResult): void {
  workStore().lastFlow = result;
}

// ---- reads ----

interface HubMasterRef {
  id: string;
  masterCode: string;
  name: string;
  status: string;
  mergedIntoId: string | null;
}

function hubList(entityType: EntityType): HubMasterRef[] {
  const s = hubStore();
  if (entityType === "startup") return s.startups as unknown as HubMasterRef[];
  if (entityType === "expert") return s.experts as unknown as HubMasterRef[];
  if (entityType === "partner") return s.partners as unknown as HubMasterRef[];
  return [];
}

/** Hub 마스터 조회(참조 확인·resolve 용, 수정 금지). */
export function findHubMaster(entityType: EntityType, id: string): HubMasterRef | undefined {
  return hubList(entityType).find((m) => m.id === id);
}

/**
 * 신청의 최종 마스터를 resolve 한다.
 * 연결 id 는 그대로 두고, 병합되었으면 merged_into_id 를 따라 최종 마스터로 귀속시킨다(§10.3).
 */
export function toApplicationView(app: WorkApplication): WorkApplicationView {
  const linked = findHubMaster(app.entityType, app.startupId);
  const resolvedId = linked ? resolveMasterId(linked) : app.startupId;
  const resolved = findHubMaster(app.entityType, resolvedId);
  return {
    ...app,
    resolvedStartupId: resolvedId,
    resolvedMasterCode: resolved?.masterCode ?? null,
    resolvedMasterName: resolved?.name ?? null,
    merged: resolvedId !== app.startupId,
  };
}

export function listPrograms(): WorkProgram[] {
  return [...workStore().programs].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function listModules(programId: string): WorkProgramModule[] {
  return workStore().modules.filter((m) => m.programId === programId);
}

export function listApplications(): WorkApplicationView[] {
  return [...workStore().applications]
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map(toApplicationView);
}

export function getApplication(id: string): WorkApplicationView | null {
  const app = workStore().applications.find((a) => a.id === id);
  return app ? toApplicationView(app) : null;
}

export function listActivities(): WorkActivity[] {
  return [...workStore().activities].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function listMinutes(): WorkMeetingMinutes[] {
  return [...workStore().minutes].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getLastFlow(): FlowResult | null {
  return workStore().lastFlow;
}

/** merge 후보 생성·resolve 대상 엔티티(hub 마스터 엔티티와 동일). */
export type WorkMasterEntity = MasterEntity;
