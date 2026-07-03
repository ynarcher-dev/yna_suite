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
