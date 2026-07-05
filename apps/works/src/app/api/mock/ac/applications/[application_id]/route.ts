import { apiOk, ApiError, handleApiError } from "@/lib/api/envelope";
import { requireWorkMockAccess } from "../../guard";
import { toApplicationApi } from "../../api-map";
import { getApplication } from "@/lib/ac-mock/mock-store";

/**
 * Mock Work 신청 조회. (근거: yna_suite_api_contracts.md §19 step 10)
 * 연결한 startup_id 는 그대로 두고, 병합되면 resolved_startup_id 가 최종 마스터로 따라간다
 * (2단계 비동기 반영, master_data_policy §10.3). 도메인 연결 계약 검증의 핵심 확인점.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ application_id: string }> },
): Promise<Response> {
  try {
    await requireWorkMockAccess("read");
    const { application_id } = await ctx.params;
    const view = getApplication(application_id);
    if (!view) throw new ApiError("not_found", "신청을 찾을 수 없습니다.");
    return apiOk(toApplicationApi(view));
  } catch (err) {
    return handleApiError(err);
  }
}
