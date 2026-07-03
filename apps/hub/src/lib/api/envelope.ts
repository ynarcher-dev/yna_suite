import { NextResponse } from "next/server";

/**
 * 공통 API 응답 envelope. (근거: yna_suite_api_contracts.md §4)
 * 성공: { ok:true, data, meta:{ request_id, next_cursor } }
 * 실패: { ok:false, error:{ code, message, details }, meta:{ request_id } }
 */

export type ApiErrorCode =
  | "unauthenticated"
  | "permission_denied"
  | "validation_failed"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "internal_error";

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  unauthenticated: 401,
  permission_denied: 403,
  validation_failed: 400,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  internal_error: 500,
};

export function newRequestId(): string {
  return `req_${crypto.randomUUID()}`;
}

/** 도메인 로직에서 던지는 API 오류. 라우트 catch 에서 envelope 로 변환한다. */
export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function apiOk<T>(data: T, meta?: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(
    { ok: true, data, meta: { request_id: newRequestId(), next_cursor: null, ...meta } },
    { status },
  );
}

export function apiFail(error: ApiError): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: { code: error.code, message: error.message, details: error.details ?? {} },
      meta: { request_id: newRequestId() },
    },
    { status: STATUS_BY_CODE[error.code] },
  );
}

/** 라우트 handler 의 공통 오류 처리. ApiError 는 그대로, 그 외는 internal_error 로. */
export function handleApiError(err: unknown): NextResponse {
  if (err instanceof ApiError) return apiFail(err);
  console.error("[api] unhandled error", err);
  return apiFail(new ApiError("internal_error", "서버 오류가 발생했습니다."));
}
