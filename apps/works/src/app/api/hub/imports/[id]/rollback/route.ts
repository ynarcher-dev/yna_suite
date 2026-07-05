import { requireHubAccess } from "@/lib/api/guard";
import { ApiError, apiOk, handleApiError } from "@/lib/api/envelope";
import { rollbackImport } from "@/lib/hub-data/service";

/**
 * POST /api/hub/imports/{id}/rollback — batch 단위 이관 되돌리기. (migration_strategy §15)
 * 이 batch 가 새로 만든 마스터를 status='archived' 로 비활성화한다(물리 삭제 없음). hub write 권한.
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const session = await requireHubAccess("write");
    const { id } = await ctx.params;
    const result = await rollbackImport(id, session.shellUser.name);
    if (!result.ok) {
      throw new ApiError("conflict", result.error ?? "rollback 에 실패했습니다.");
    }
    return apiOk({ batch_id: result.batchId, status: result.status });
  } catch (err) {
    return handleApiError(err);
  }
}
