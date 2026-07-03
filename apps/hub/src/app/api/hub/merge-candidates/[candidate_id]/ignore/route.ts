import { requireMergeAccess } from "@/lib/api/guard";
import { ApiError, apiOk, handleApiError } from "@/lib/api/envelope";
import { apiIgnoreMerge } from "@/lib/hub-data/service-merge";

/**
 * POST /api/hub/merge-candidates/{candidate_id}/ignore — 병합 무시.
 * (근거: yna_suite_api_contracts.md §15 — 낮은 품질/반복 노이즈 후보에 사용, audit 대상)
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ candidate_id: string }> },
): Promise<Response> {
  try {
    const session = await requireMergeAccess();
    const { candidate_id } = await ctx.params;
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
    if (!reason) throw new ApiError("validation_failed", "reason 은 필수입니다.");
    const data = await apiIgnoreMerge(candidate_id, reason, session.shellUser.name);
    return apiOk(data);
  } catch (err) {
    return handleApiError(err);
  }
}
