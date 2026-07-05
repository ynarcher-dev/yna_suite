import { requireHubAccess } from "@/lib/api/guard";
import { ApiError, apiOk, handleApiError } from "@/lib/api/envelope";
import { isMasterEntity, mapAddAliasBody } from "@/lib/hub-data/api-map";
import { apiAddAlias } from "@/lib/hub-data/service-subrecords";

/**
 * POST /api/hub/masters/{entity_type}/{id}/aliases — 별칭 추가(공통 계약).
 * (근거: yna_suite_api_contracts.md §11, master_data_policy §6)
 * 대표값에서 밀려난 이름 보존 + normalized 생성(검색용) + 중복 방지 + audit.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ entity_type: string; id: string }> },
): Promise<Response> {
  try {
    const session = await requireHubAccess("write");
    const { entity_type, id } = await ctx.params;
    if (!isMasterEntity(entity_type)) {
      throw new ApiError("validation_failed", "entity_type 은 startup/expert/partner 중 하나여야 합니다.");
    }
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) throw new ApiError("validation_failed", "요청 본문(JSON)이 필요합니다.");
    const input = mapAddAliasBody(body);
    if (!input.aliasType) throw new ApiError("validation_failed", "alias_type 은 필수입니다.");
    if (!input.aliasValue) throw new ApiError("validation_failed", "alias_value 는 필수입니다.");

    const data = await apiAddAlias(
      entity_type,
      id,
      { aliasType: input.aliasType, aliasValue: input.aliasValue, reason: input.reason },
      session.shellUser.name,
    );
    return apiOk(data, undefined, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
