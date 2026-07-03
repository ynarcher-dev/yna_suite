import { z } from "zod";

/**
 * 클라이언트에 노출 가능한 공개 환경변수 스키마.
 * NEXT_PUBLIC_ 접두사 값만 포함한다. service role key 등 secret 은 여기 두지 않는다.
 * (근거: yna_suite_environment_deployment.md §6~7, yna_suite_security_policy.md — secret 격리)
 */
export const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_ENV: z.enum(["local", "dev", "staging", "production"]).default("local"),
  NEXT_PUBLIC_APP_NAME: z.string().min(1),
  NEXT_PUBLIC_APP_DOMAIN: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_AUTH_REDIRECT_URL: z.string().url(),
  /**
   * 서브도메인 세션 공유용 쿠키 도메인(예: .ynarcher.co.kr).
   * 로컬(localhost)에서는 비워 두어 host 기본값을 쓴다.
   * (근거: yna_suite_auth_permissions.md §3, 4_memo 이슈01 — 서브도메인 SSO)
   */
  NEXT_PUBLIC_COOKIE_DOMAIN: z.string().optional(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

/**
 * 서버 전용 secret 스키마. 절대 클라이언트 번들/로그에 노출하지 않는다.
 * 서버(Route Handler / Server Action)에서만 parse 한다.
 */
export const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/** 공개 env 파싱. 잘못된 설정을 부팅 시점에 드러낸다. */
export function parsePublicEnv(source: Record<string, string | undefined>): PublicEnv {
  return publicEnvSchema.parse(source);
}

/**
 * 공개 env 안전 파싱. Supabase 설정이 없으면 null 을 반환한다(throw 하지 않음).
 * 로컬 개발에서 Supabase 백엔드 없이(dev 폴백 세션) 앱을 띄우기 위한 경로.
 * (근거: 4_memo 이슈15 — Docker 미설치 환경에서 실제 로그인 불가)
 */
export function parsePublicEnvSafe(source: Record<string, string | undefined>): PublicEnv | null {
  const result = publicEnvSchema.safeParse(source);
  return result.success ? result.data : null;
}
