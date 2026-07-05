import { requireHubAccess } from "@/lib/api/guard";
import { ApiError, apiOk, handleApiError } from "@/lib/api/envelope";
import { isMasterEntity, toSearchApiItem } from "@/lib/hub-data/api-map";
import { searchMasterCandidates } from "@/lib/hub-data/service";

/**
 * GET /api/hub/master-search — 마스터 검색(모든 도메인 앱 공통 계약).
 * (근거: yna_suite_api_contracts.md §6)
 * Query: entity_type(필수) · q(필수) · limit(기본 20, 최대 100) · include_merged(기본 false)
 */
export async function GET(req: Request): Promise<Response> {
  try {
    await requireHubAccess("read");

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entity_type");
    const q = searchParams.get("q") ?? "";
    const includeMerged = ["1", "true"].includes(searchParams.get("include_merged") ?? "");
    const limitRaw = Number(searchParams.get("limit") ?? "20");

    if (!isMasterEntity(entityType)) {
      throw new ApiError("validation_failed", "entity_type 은 startup/expert/partner 중 하나여야 합니다.");
    }
    if (!q.trim()) {
      throw new ApiError("validation_failed", "검색어(q)를 입력하세요.");
    }
    const limit = Number.isFinite(limitRaw) ? Math.min(100, Math.max(1, Math.trunc(limitRaw))) : 20;

    const items = await searchMasterCandidates({ entityType, q, limit, includeMerged });
    return apiOk({ items: items.map(toSearchApiItem) });
  } catch (err) {
    return handleApiError(err);
  }
}
