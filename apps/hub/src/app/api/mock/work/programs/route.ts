import { apiOk, ApiError, handleApiError } from "@/lib/api/envelope";
import { requireWorkMockAccess } from "../guard";
import { mapProgramBody, toProgramApi } from "../api-map";
import { createProgram, listPrograms } from "@/lib/work-mock/mock-store";

/**
 * Mock Work 프로그램. (근거: yna_suite_api_contracts.md §19)
 * production 비활성화 + work 권한. Program First 구조의 최상위 단위.
 */
export async function GET(): Promise<Response> {
  try {
    await requireWorkMockAccess("read");
    return apiOk({ items: listPrograms().map(toProgramApi) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request): Promise<Response> {
  try {
    const session = await requireWorkMockAccess("write");
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      throw new ApiError("validation_failed", "요청 본문(JSON)이 필요합니다.");
    }
    const program = createProgram(mapProgramBody(body), session.shellUser.name);
    return apiOk(toProgramApi(program), undefined, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
