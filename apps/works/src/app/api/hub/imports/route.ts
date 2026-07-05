import { requireHubAccess } from "@/lib/api/guard";
import { ApiError, apiOk, handleApiError } from "@/lib/api/envelope";
import {
  importSummaryApi,
  mapImportRunBody,
  toImportBatchApi,
  toImportDryRunApi,
} from "@/lib/hub-data/api-map";
import { dryRunImport, listImportBatches, runImport } from "@/lib/hub-data/service";

/**
 * GET /api/hub/imports — import batch 목록(운영자 조회). (functional_spec §14)
 * hub read 권한. 최신순 batch 요약을 반환한다.
 */
export async function GET(): Promise<Response> {
  try {
    await requireHubAccess("read");
    const batches = await listImportBatches();
    return apiOk({ items: batches.map(toImportBatchApi) });
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * POST /api/hub/imports — 기존 스타트업 DB 이관 실행. (migration_strategy §9·16)
 * ?dry_run=1 이면 운영 미반영 검증 리포트만 계산(200), 아니면 실제 이관(201).
 * hub write 권한.
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const session = await requireHubAccess("write");

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      throw new ApiError("validation_failed", "요청 본문(JSON)이 필요합니다.");
    }
    const input = mapImportRunBody(body);
    if (!input.rows.length) {
      throw new ApiError("validation_failed", "이관할 rows(배열)가 필요합니다.");
    }

    const { searchParams } = new URL(req.url);
    const dryRun = ["1", "true"].includes(searchParams.get("dry_run") ?? "");
    if (dryRun) {
      const report = await dryRunImport(input);
      return apiOk(toImportDryRunApi(report));
    }

    const result = await runImport(input, session.shellUser.name);
    if (!result.ok) throw new ApiError("internal_error", result.error ?? "이관에 실패했습니다.");
    return apiOk(
      {
        batch_id: result.batchId,
        status: result.status,
        summary: result.summary ? importSummaryApi(result.summary) : null,
      },
      undefined,
      201,
    );
  } catch (err) {
    return handleApiError(err);
  }
}
