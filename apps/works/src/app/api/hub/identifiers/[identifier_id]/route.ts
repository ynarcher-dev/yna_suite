import { requireHubAccess } from "@/lib/api/guard";
import { ApiError, apiOk, handleApiError } from "@/lib/api/envelope";
import { deleteReason, mapPatchIdentifierBody } from "@/lib/hub-data/api-map";
import { apiDeleteIdentifier, apiPatchIdentifier } from "@/lib/hub-data/service-subrecords";

/**
 * PATCH /api/hub/identifiers/{identifier_id} — 대표 지정 / 검증 상태 변경.
 * (근거: yna_suite_api_contracts.md §10 — primary 변경은 기존 primary 해제를 포함해 트랜잭션)
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ identifier_id: string }> },
): Promise<Response> {
  try {
    const session = await requireHubAccess("write");
    const { identifier_id } = await ctx.params;
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) throw new ApiError("validation_failed", "요청 본문(JSON)이 필요합니다.");
    const input = mapPatchIdentifierBody(body);
    const data = await apiPatchIdentifier(identifier_id, input, session.shellUser.name);
    return apiOk(data);
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * DELETE /api/hub/identifiers/{identifier_id} — 식별자 삭제.
 * (근거: yna_suite_api_contracts.md §10)
 */
export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ identifier_id: string }> },
): Promise<Response> {
  try {
    const session = await requireHubAccess("write");
    const { identifier_id } = await ctx.params;
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const data = await apiDeleteIdentifier(identifier_id, deleteReason(body), session.shellUser.name);
    return apiOk(data);
  } catch (err) {
    return handleApiError(err);
  }
}
