import { requireMergeAccess } from "@/lib/api/guard";
import { apiOk, handleApiError } from "@/lib/api/envelope";
import { apiGetMergeCandidate } from "@/lib/hub-data/service-merge";

/**
 * GET /api/hub/merge-candidates/{candidate_id} — 후보 상세(좌우 비교 + 미리보기).
 * (근거: yna_suite_api_contracts.md §12, functional_spec §15)
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ candidate_id: string }> },
): Promise<Response> {
  try {
    await requireMergeAccess();
    const { candidate_id } = await ctx.params;
    const data = await apiGetMergeCandidate(candidate_id);
    return apiOk(data);
  } catch (err) {
    return handleApiError(err);
  }
}
