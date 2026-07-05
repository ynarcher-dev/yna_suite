import { requireHubAccess } from "@/lib/api/guard";
import { ApiError, apiOk, handleApiError } from "@/lib/api/envelope";
import { toImportBatchDetailApi } from "@/lib/hub-data/api-map";
import { getImportBatchDetail } from "@/lib/hub-data/service";

/**
 * GET /api/hub/imports/{id} — import batch 상세(요약 + row + 실패 사유). (functional_spec §14)
 * hub read 권한.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    await requireHubAccess("read");
    const { id } = await ctx.params;
    const detail = await getImportBatchDetail(id);
    if (!detail) throw new ApiError("not_found", "import batch 를 찾을 수 없습니다.");
    return apiOk(toImportBatchDetailApi(detail));
  } catch (err) {
    return handleApiError(err);
  }
}
