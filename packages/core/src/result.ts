/**
 * 공통 Result 객체. 예외 대신 성공/실패를 값으로 표현할 때 사용한다.
 */
export type Result<T, E = AppError> = { ok: true; value: T } | { ok: false; error: E };

export function ok<T>(value: T): { ok: true; value: T } {
  return { ok: true, value };
}

export function err<E>(error: E): { ok: false; error: E } {
  return { ok: false, error };
}

/** 앱 전역 에러 코드. 필요 시 도메인별로 확장한다. */
export type AppErrorCode =
  "unauthorized" | "forbidden" | "not_found" | "validation" | "conflict" | "internal";

export interface AppError {
  code: AppErrorCode;
  message: string;
  /** 디버깅/로깅용 부가 정보. 개인정보 원문은 넣지 않는다. */
  details?: Record<string, unknown>;
}

export function appError(
  code: AppErrorCode,
  message: string,
  details?: Record<string, unknown>,
): AppError {
  return { code, message, details };
}
