import { requireMergeAccess } from "@/lib/api/guard";
import { apiOk, handleApiError } from "@/lib/api/envelope";
import { apiPreviewMerge } from "@/lib/hub-data/service-merge";
import { mapFieldPolicy } from "@/lib/hub-data/api-map";

/**
 * POST /api/hub/merge-candidates/{candidate_id}/preview — 병합 미리보기.
 * (근거: yna_suite_api_contracts.md §13 — field_resolution + affected_records 사전 계산)
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ candidate_id: string }> },
): Promise<Response> {
  try {
    await requireMergeAccess();
    const { candidate_id } = await ctx.params;
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const fieldPolicy = mapFieldPolicy(body?.field_policy);
    const data = await apiPreviewMerge(candidate_id, fieldPolicy);
    return apiOk(data);
  } catch (err) {
    return handleApiError(err);
  }
}
