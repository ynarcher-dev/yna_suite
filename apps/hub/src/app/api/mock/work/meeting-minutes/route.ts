import { apiOk, ApiError, handleApiError } from "@/lib/api/envelope";
import { requireWorkMockAccess } from "../guard";
import { mapMinutesBody, toMinutesApi } from "../api-map";
import { createMeetingMinutes } from "@/lib/work-mock/mock-store";

/**
 * Mock Work 회의록. (근거: yna_suite_api_contracts.md §19, existing_source_alignment §6)
 * 안건/논의/결정/첨부 중심의 가벼운 기록. program/module/activity 에 연결된다.
 */
export async function POST(req: Request): Promise<Response> {
  try {
    await requireWorkMockAccess("write");
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      throw new ApiError("validation_failed", "요청 본문(JSON)이 필요합니다.");
    }
    const input = mapMinutesBody(body);
    let minutes;
    try {
      minutes = createMeetingMinutes(input);
    } catch (e) {
      throw new ApiError("not_found", e instanceof Error ? e.message : "프로그램을 찾을 수 없습니다.");
    }
    return apiOk(toMinutesApi(minutes), undefined, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
