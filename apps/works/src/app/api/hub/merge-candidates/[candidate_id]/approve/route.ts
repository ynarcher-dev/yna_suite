import { requireMergeAccess } from "@/lib/api/guard";
import { ApiError, apiOk, handleApiError } from "@/lib/api/envelope";
import { apiApproveMerge } from "@/lib/hub-data/service-merge";
import { mapFieldPolicy } from "@/lib/hub-data/api-map";

/**
 * POST /api/hub/merge-candidates/{candidate_id}/approve — 병합 승인.
 * (근거: yna_suite_api_contracts.md §14 — 1단계 동기 커밋 + 2단계 비동기 FK 반영)
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ candidate_id: string }> },
): Promise<Response> {
  try {
    const session = await requireMergeAccess();
    const { candidate_id } = await ctx.params;
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) throw new ApiError("validation_failed", "요청 본문(JSON)이 필요합니다.");
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!reason) throw new ApiError("validation_failed", "reason 은 필수입니다.");
    const fieldPolicy = mapFieldPolicy(body.field_policy);
    const data = await apiApproveMerge(candidate_id, { fieldPolicy, reason }, session.shellUser.name);
    return apiOk(data);
  } catch (err) {
    return handleApiError(err);
  }
}
