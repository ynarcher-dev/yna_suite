import { requireHubAccess } from "@/lib/api/guard";
import { apiOk, handleApiError } from "@/lib/api/envelope";
import { deleteReason } from "@/lib/hub-data/api-map";
import { apiDeleteAlias } from "@/lib/hub-data/service-subrecords";

/**
 * DELETE /api/hub/aliases/{alias_id} — 별칭 삭제.
 * (근거: yna_suite_api_contracts.md §11)
 */
export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ alias_id: string }> },
): Promise<Response> {
  try {
    const session = await requireHubAccess("write");
    const { alias_id } = await ctx.params;
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const data = await apiDeleteAlias(alias_id, deleteReason(body), session.shellUser.name);
    return apiOk(data);
  } catch (err) {
    return handleApiError(err);
  }
}
