"use server";

import { revalidatePath } from "next/cache";
import { approveMerge, holdMerge, ignoreMerge, rejectMerge } from "./service";
import { actorName, guardConfigured } from "./action-helpers";
import type { MergeApproveResult } from "./types";

/**
 * 중복 후보 수동 병합 서버 액션(Hub 검토 화면 전용).
 * (근거: yna_suite_api_contracts.md §14~15, master_data_policy §10·15)
 *
 * 안전장치: 사유 필수(mock-merge 에서 강제), 병합/반려/무시/보류 모두 audit 기록.
 * 병합 승인은 정책 §10.3 혼합형(1단계 동기 + 2단계 비동기). 최종 강제는 RLS(`can_merge_master`).
 */

/** 후보 검토 화면·목록·관련 마스터 목록을 재검증한다. */
function revalidateMerge(id: string, targetId?: string): void {
  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/merge-candidates");
  revalidatePath(`/merge-candidates/${id}`);
  for (const p of ["/startups", "/experts", "/partners"]) revalidatePath(p);
  if (targetId) {
    for (const p of ["/startups", "/experts", "/partners"]) revalidatePath(`${p}/${targetId}`);
  }
}

export async function approveMergeCandidate(args: {
  id: string;
  fieldPolicy?: Record<string, string>;
  reason: string;
}): Promise<MergeApproveResult> {
  const blocked = guardConfigured();
  if (blocked) return blocked;
  const res = await approveMerge(args.id, { fieldPolicy: args.fieldPolicy, reason: args.reason }, await actorName());
  if (res.ok) revalidateMerge(args.id, res.targetId);
  return res;
}

export async function rejectMergeCandidate(args: { id: string; reason: string }): Promise<MergeApproveResult> {
  const blocked = guardConfigured();
  if (blocked) return blocked;
  const res = await rejectMerge(args.id, args.reason, await actorName());
  if (res.ok) revalidateMerge(args.id);
  return res;
}

export async function ignoreMergeCandidate(args: { id: string; reason: string }): Promise<MergeApproveResult> {
  const blocked = guardConfigured();
  if (blocked) return blocked;
  const res = await ignoreMerge(args.id, args.reason, await actorName());
  if (res.ok) revalidateMerge(args.id);
  return res;
}

export async function holdMergeCandidate(args: { id: string; reason: string }): Promise<MergeApproveResult> {
  const blocked = guardConfigured();
  if (blocked) return blocked;
  const res = await holdMerge(args.id, args.reason, await actorName());
  if (res.ok) revalidateMerge(args.id);
  return res;
}
