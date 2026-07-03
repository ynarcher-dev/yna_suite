import type { EntityType } from "@yna/core";
import { ENTITY_TYPES } from "@yna/core";
import { ApiError } from "@/lib/api/envelope";
import {
  WORK_ACTIVITY_TYPES,
  WORK_MODULE_TYPES,
  type CreateActivityInput,
  type CreateApplicationInput,
  type CreateMeetingMinutesInput,
  type CreateModuleInput,
  type CreateProgramInput,
  type WorkActivity,
  type WorkApplicationView,
  type WorkMeetingMinutes,
  type WorkModuleType,
  type WorkActivityType,
  type WorkProgram,
  type WorkProgramModule,
} from "@/lib/work-mock/types";

/**
 * Mock Work API 의 snake_case 계약 ↔ 내부 camelCase 매핑(Phase 1.13).
 * (근거: yna_suite_api_contracts.md §19 요청/응답 필드)
 */

function str(body: Record<string, unknown>, key: string): string | null {
  const v = body[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function required(body: Record<string, unknown>, key: string): string {
  const v = str(body, key);
  if (!v) throw new ApiError("validation_failed", `${key} 은(는) 필수입니다.`);
  return v;
}

// ---- request body → input ----

export function mapProgramBody(body: Record<string, unknown>): CreateProgramInput {
  return {
    name: required(body, "name"),
    startDate: str(body, "start_date"),
    endDate: str(body, "end_date"),
  };
}

export function mapModuleBody(body: Record<string, unknown>): CreateModuleInput {
  const moduleType = required(body, "module_type");
  if (!WORK_MODULE_TYPES.includes(moduleType as WorkModuleType)) {
    throw new ApiError("validation_failed", "module_type 이 올바르지 않습니다.");
  }
  return { moduleType: moduleType as WorkModuleType, name: required(body, "name") };
}

export function mapApplicationBody(body: Record<string, unknown>): CreateApplicationInput {
  const entityRaw = str(body, "entity_type") ?? "startup";
  if (!ENTITY_TYPES.includes(entityRaw as EntityType)) {
    throw new ApiError("validation_failed", "entity_type 이 올바르지 않습니다.");
  }
  return {
    programId: required(body, "program_id"),
    moduleId: str(body, "module_id"),
    entityType: entityRaw as EntityType,
    startupId: required(body, "startup_id"),
    applicantName: required(body, "applicant_name"),
  };
}

export function mapActivityBody(body: Record<string, unknown>): CreateActivityInput {
  const activityType = required(body, "activity_type");
  if (!WORK_ACTIVITY_TYPES.includes(activityType as WorkActivityType)) {
    throw new ApiError("validation_failed", "activity_type 이 올바르지 않습니다.");
  }
  return {
    programId: required(body, "program_id"),
    moduleId: str(body, "module_id"),
    activityType: activityType as WorkActivityType,
    title: required(body, "title"),
    startsAt: str(body, "starts_at"),
  };
}

export function mapMinutesBody(body: Record<string, unknown>): CreateMeetingMinutesInput {
  const attachments = Array.isArray(body.attachment_ids)
    ? body.attachment_ids.filter((x): x is string => typeof x === "string")
    : [];
  return {
    programId: required(body, "program_id"),
    moduleId: str(body, "module_id"),
    activityId: str(body, "activity_id"),
    title: required(body, "title"),
    agenda: str(body, "agenda"),
    discussion: str(body, "discussion"),
    decisions: str(body, "decisions"),
    attachmentIds: attachments,
  };
}

// ---- output → snake_case ----

export function toProgramApi(p: WorkProgram) {
  return {
    id: p.id,
    name: p.name,
    start_date: p.startDate,
    end_date: p.endDate,
    created_by: p.createdBy,
    created_at: p.createdAt,
  };
}

export function toModuleApi(m: WorkProgramModule) {
  return {
    id: m.id,
    program_id: m.programId,
    module_type: m.moduleType,
    name: m.name,
    created_at: m.createdAt,
  };
}

export function toApplicationApi(v: WorkApplicationView) {
  return {
    id: v.id,
    program_id: v.programId,
    module_id: v.moduleId,
    entity_type: v.entityType,
    applicant_name: v.applicantName,
    status: v.status,
    startup_id: v.startupId,
    resolved_startup_id: v.resolvedStartupId,
    resolved_master_code: v.resolvedMasterCode,
    resolved_master_name: v.resolvedMasterName,
    merged: v.merged,
    created_at: v.createdAt,
  };
}

export function toActivityApi(a: WorkActivity) {
  return {
    id: a.id,
    program_id: a.programId,
    module_id: a.moduleId,
    activity_type: a.activityType,
    title: a.title,
    starts_at: a.startsAt,
    created_at: a.createdAt,
  };
}

export function toMinutesApi(m: WorkMeetingMinutes) {
  return {
    id: m.id,
    program_id: m.programId,
    module_id: m.moduleId,
    activity_id: m.activityId,
    title: m.title,
    agenda: m.agenda,
    discussion: m.discussion,
    decisions: m.decisions,
    attachment_ids: m.attachmentIds,
    created_at: m.createdAt,
  };
}
