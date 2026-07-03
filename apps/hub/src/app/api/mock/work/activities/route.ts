import { apiOk, ApiError, handleApiError } from "@/lib/api/envelope";
import { requireWorkMockAccess } from "../guard";
import { mapActivityBody, toActivityApi } from "../api-map";
import { createActivity } from "@/lib/work-mock/mock-store";

/**
 * Mock Work custom activity. (근거: yna_suite_api_contracts.md §19, existing_source_alignment §5)
 * 정형 모듈로 담기 어려운 운영 행사(IR 리허설·기관 협의 미팅 등)를 activity 로 관리한다.
 */
export async function POST(req: Request): Promise<Response> {
  try {
    await requireWorkMockAccess("write");
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      throw new ApiError("validation_failed", "요청 본문(JSON)이 필요합니다.");
    }
    const input = mapActivityBody(body);
    let activity;
    try {
      activity = createActivity(input);
    } catch (e) {
      throw new ApiError("not_found", e instanceof Error ? e.message : "프로그램을 찾을 수 없습니다.");
    }
    return apiOk(toActivityApi(activity), undefined, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
