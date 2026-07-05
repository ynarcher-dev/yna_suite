import { requireHubAccess } from "@/lib/api/guard";
import { ApiError, apiOk, handleApiError } from "@/lib/api/envelope";
import { isMasterEntity, mapAddIdentifierBody } from "@/lib/hub-data/api-map";
import { apiAddIdentifier } from "@/lib/hub-data/service-subrecords";

/**
 * POST /api/hub/masters/{entity_type}/{id}/identifiers — 식별자 추가(공통 계약).
 * (근거: yna_suite_api_contracts.md §10, master_data_policy §5)
 * 원본값 보존 + normalized 생성 + 중복 방지 + (선택) 대표 지정 + audit.
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
    const input = mapAddIdentifierBody(body);
    if (!input.identifierType) throw new ApiError("validation_failed", "identifier_type 은 필수입니다.");
    if (!input.identifierValue) throw new ApiError("validation_failed", "identifier_value 는 필수입니다.");

    const data = await apiAddIdentifier(
      entity_type,
      id,
      { identifierType: input.identifierType, identifierValue: input.identifierValue, isPrimary: input.isPrimary, reason: input.reason },
      session.shellUser.name,
    );
    return apiOk(data, undefined, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
