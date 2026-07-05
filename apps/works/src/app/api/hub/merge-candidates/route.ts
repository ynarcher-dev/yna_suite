import { requireMergeAccess } from "@/lib/api/guard";
import { apiOk, handleApiError } from "@/lib/api/envelope";
import { apiListMergeCandidates } from "@/lib/hub-data/service-merge";
import { isMasterEntity } from "@/lib/hub-data/api-map";
import type { MergeCandidateFilter } from "@/lib/hub-data/types";

/**
 * GET /api/hub/merge-candidates — 중복 후보 목록.
 * (근거: yna_suite_api_contracts.md §12 — entity_type·status·min_score 필터)
 */
export async function GET(req: Request): Promise<Response> {
  try {
    await requireMergeAccess();
    const url = new URL(req.url);
    const entityTypeRaw = url.searchParams.get("entity_type");
    const statusRaw = url.searchParams.get("status");
    const minScoreRaw = url.searchParams.get("min_score");

    const filter: MergeCandidateFilter = {
      entityType: isMasterEntity(entityTypeRaw) ? entityTypeRaw : "all",
      status: (statusRaw as MergeCandidateFilter["status"]) ?? "all",
      minScore: minScoreRaw != null && minScoreRaw !== "" ? Number(minScoreRaw) : undefined,
    };
    if (typeof filter.minScore === "number" && Number.isNaN(filter.minScore)) filter.minScore = undefined;

    const items = await apiListMergeCandidates(filter);
    return apiOk(items, { count: items.length });
  } catch (err) {
    return handleApiError(err);
  }
}
