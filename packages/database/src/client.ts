import { createBrowserClient, createServerClient } from "@supabase/ssr";
import type { Database } from "./types";

/**
 * Supabase client 팩토리.
 * (근거: yna_suite_tech_stack.md §6, yna_suite_foldering.md §4 packages/database)
 *
 * 프레임워크(next)에 직접 의존하지 않도록 cookie 어댑터를 주입받는다.
 * - 브라우저: createBrowserSupabaseClient
 * - 서버(Route Handler / Server Component): createServerSupabaseClient(cookieAdapter)
 *
 * service role key 를 쓰는 관리자 client 는 서버 전용이며 별도(auth 초대 등)에서 다룬다.
 */

export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

export interface CookieToSet {
  name: string;
  value: string;
  options?: unknown;
}

/** SSR 쿠키 접근 어댑터. next/headers cookies() 등을 앱에서 연결한다. */
export interface CookieAdapter {
  getAll(): { name: string; value: string }[];
  setAll(cookies: CookieToSet[]): void;
}

export function createBrowserSupabaseClient(env: SupabaseEnv) {
  return createBrowserClient<Database>(env.url, env.anonKey);
}

export function createServerSupabaseClient(env: SupabaseEnv, cookies: CookieAdapter) {
  return createServerClient<Database>(env.url, env.anonKey, {
    cookies: {
      getAll: () => cookies.getAll(),
      setAll: (toSet: CookieToSet[]) => cookies.setAll(toSet),
    },
  });
}

export type SupabaseServerClient = ReturnType<typeof createServerSupabaseClient>;
export type SupabaseBrowserClient = ReturnType<typeof createBrowserSupabaseClient>;
