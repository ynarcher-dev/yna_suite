import { parsePublicEnvSafe, type PublicEnv } from "@yna/config";
import type { SupabaseEnv } from "@yna/database";

/**
 * 이 앱이 소유한 서비스 도메인. 진입 권한/RLS 판정 기준.
 * (근거: yna_suite_auth_permissions.md §7 — apps/dev → domain_name='dev', master 계열만 접근)
 */
export const APP_DOMAIN = "dev" as const;

/**
 * 공개 env 파싱 결과. Supabase 설정이 없으면 null(로컬 dev 폴백 경로).
 * (근거: 4_memo 이슈15 — Docker 미설치 환경에서 실제 로그인 불가)
 */
export const publicEnv: PublicEnv | null = parsePublicEnvSafe({
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_APP_DOMAIN: process.env.NEXT_PUBLIC_APP_DOMAIN,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_AUTH_REDIRECT_URL: process.env.NEXT_PUBLIC_AUTH_REDIRECT_URL,
  NEXT_PUBLIC_COOKIE_DOMAIN: process.env.NEXT_PUBLIC_COOKIE_DOMAIN,
});

/** Supabase 백엔드 연결 가능 여부. false 면 dev 폴백 세션으로 동작한다. */
export const isSupabaseConfigured = publicEnv !== null;

/** Supabase client 팩토리에 넘길 env(미설정이면 null). */
export const supabaseEnv: SupabaseEnv | null = publicEnv
  ? {
      url: publicEnv.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      cookieDomain: publicEnv.NEXT_PUBLIC_COOKIE_DOMAIN,
    }
  : null;
