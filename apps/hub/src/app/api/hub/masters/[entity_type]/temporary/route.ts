import { requireHubAccess } from "@/lib/api/guard";
import { ApiError, apiOk, handleApiError } from "@/lib/api/envelope";
import { isMasterEntity, mapTemporaryBody, toTemporaryApiData } from "@/lib/hub-data/api-map";
import { createTemporaryMaster } from "@/lib/hub-data/service";

/**
 * POST /api/hub/masters/{entity_type}/temporary — 임시 마스터 생성(공통 계약).
 * (근거: yna_suite_api_contracts.md §7, master_data_policy §7~9)
 * validation → normalized → TEMP 생성 → 식별자/별칭 → 중복 후보 → audit log.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ entity_type: string }> },
): Promise<Response> {
  try {
    const session = await requireHubAccess("write");

    const { entity_type } = await ctx.params;
    if (!isMasterEntity(entity_type)) {
      throw new ApiError("validation_failed", "entity_type 은 startup/expert/partner 중 하나여야 합니다.");
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      throw new ApiError("validation_failed", "요청 본문(JSON)이 필요합니다.");
    }
    const input = mapTemporaryBody(body);
    if (!input.name) {
      throw new ApiError("validation_failed", "name(표시명)은 필수입니다.");
    }

    const result = await createTemporaryMaster(entity_type, input, session.shellUser.name);
    return apiOk(toTemporaryApiData(result), undefined, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
