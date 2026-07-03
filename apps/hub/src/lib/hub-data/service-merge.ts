import "server-only";
import { ApiError } from "@/lib/api/envelope";
import {
  approveMerge,
  getMergeCandidateDetail,
  ignoreMerge,
  listMergeCandidates,
  previewMerge,
  rejectMerge,
} from "./service";
import {
  toMergeCandidateApiItem,
  toMergeCandidateDetailApiData,
  toMergePreviewApiData,
} from "./api-map";
import type { MergeApproveResult, MergeCandidateFilter } from "./types";

/**
 * 중복 후보 조회·병합 HTTP 계약 서비스(공통 API §12~15).
 * (근거: yna_suite_api_contracts.md §12~15, master_data_policy §10·13~15)
 *
 * 모든 도메인 앱이 재사용하는 계약이므로 공통 envelope 오류 코드(ApiError)로 실패를 표현한다.
 * 병합 승인은 정책 §10.3 혼합형 — 1단계 동기 커밋 + 2단계 비동기 FK 반영.
 */

export async function apiListMergeCandidates(filter: MergeCandidateFilter) {
  const items = await listMergeCandidates(filter);
  return items.map(toMergeCandidateApiItem);
}

export async function apiGetMergeCandidate(id: string) {
  const detail = await getMergeCandidateDetail(id);
  if (!detail) throw new ApiError("not_found", "병합 후보를 찾을 수 없습니다.");
  return toMergeCandidateDetailApiData(detail);
}

export async function apiPreviewMerge(id: string, fieldPolicy?: Record<string, string>) {
  const preview = await previewMerge(id, fieldPolicy);
  if (!preview) throw new ApiError("not_found", "병합 후보를 찾을 수 없습니다.");
  return toMergePreviewApiData(preview);
}

/** 병합 결과(ok/error)를 envelope 오류로 변환한다. */
function unwrap(result: MergeApproveResult) {
  if (!result.ok) {
    if (result.error?.includes("찾을 수 없")) throw new ApiError("not_found", result.error);
    if (result.error?.includes("충돌")) throw new ApiError("conflict", result.error);
    if (result.error?.includes("이미") || result.error?.includes("대기 중"))
      throw new ApiError("conflict", result.error ?? "병합할 수 없습니다.");
    throw new ApiError("validation_failed", result.error ?? "병합 처리에 실패했습니다.");
  }
  return {
    target_entity_id: result.targetId ?? null,
    event_id: result.eventId ?? null,
    sync_status: result.syncStatus ?? null,
  };
}

export async function apiApproveMerge(
  id: string,
  input: { fieldPolicy?: Record<string, string>; reason: string },
  actorName: string,
) {
  return unwrap(await approveMerge(id, { fieldPolicy: input.fieldPolicy, reason: input.reason }, actorName));
}

export async function apiRejectMerge(id: string, reason: string, actorName: string) {
  return unwrap(await rejectMerge(id, reason, actorName));
}

export async function apiIgnoreMerge(id: string, reason: string, actorName: string) {
  return unwrap(await ignoreMerge(id, reason, actorName));
}
