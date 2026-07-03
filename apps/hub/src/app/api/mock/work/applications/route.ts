import { apiOk, ApiError, handleApiError } from "@/lib/api/envelope";
import { requireWorkMockAccess } from "../guard";
import { mapApplicationBody, toApplicationApi } from "../api-map";
import {
  createApplication,
  listApplications,
  toApplicationView,
} from "@/lib/work-mock/mock-store";

/**
 * Mock Work 신청. (근거: yna_suite_api_contracts.md §19)
 * 신청은 Hub 마스터를 startup_id 로 참조하되 직접 수정하지 않는다. 병합 후 최종 마스터는
 * 응답의 resolved_startup_id 로 확인한다(§10.3 resolved view/helper).
 */
export async function GET(): Promise<Response> {
  try {
    await requireWorkMockAccess("read");
    return apiOk({ items: listApplications().map(toApplicationApi) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request): Promise<Response> {
  try {
    await requireWorkMockAccess("write");
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      throw new ApiError("validation_failed", "요청 본문(JSON)이 필요합니다.");
    }
    const input = mapApplicationBody(body);
    let app;
    try {
      app = createApplication(input);
    } catch (e) {
      throw new ApiError("not_found", e instanceof Error ? e.message : "연결 대상을 찾을 수 없습니다.");
    }
    return apiOk(toApplicationApi(toApplicationView(app)), undefined, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
