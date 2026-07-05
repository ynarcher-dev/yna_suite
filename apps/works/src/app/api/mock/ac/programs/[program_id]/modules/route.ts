import { apiOk, ApiError, handleApiError } from "@/lib/api/envelope";
import { requireWorkMockAccess } from "../../../guard";
import { mapModuleBody, toModuleApi } from "../../../api-map";
import { createModule } from "@/lib/ac-mock/mock-store";

/**
 * Mock Work 프로그램 모듈. (근거: yna_suite_api_contracts.md §19)
 * 프로그램 안에 모집/평가/멘토링 같은 정형 모듈이 붙는다(existing_source_alignment §4).
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ program_id: string }> },
): Promise<Response> {
  try {
    await requireWorkMockAccess("write");
    const { program_id } = await ctx.params;
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      throw new ApiError("validation_failed", "요청 본문(JSON)이 필요합니다.");
    }
    const input = mapModuleBody(body);
    let mod;
    try {
      mod = createModule(program_id, input);
    } catch (e) {
      throw new ApiError("not_found", e instanceof Error ? e.message : "프로그램을 찾을 수 없습니다.");
    }
    return apiOk(toModuleApi(mod), undefined, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
