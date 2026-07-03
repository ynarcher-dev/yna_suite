import "server-only";
import { cookies } from "next/headers";
import {
  createServerSupabaseClient,
  type CookieToSet,
  type SupabaseServerClient,
} from "@yna/database";
import { supabaseEnv } from "./env";

/**
 * 서버(Server Component / Server Action / Route Handler)용 Supabase client.
 * next/headers 의 cookies() 를 @yna/database 의 cookie 어댑터로 연결한다.
 * Supabase 미설정(dev 폴백) 시에는 null 을 반환한다.
 */
export async function getServerClient(): Promise<SupabaseServerClient | null> {
  if (!supabaseEnv) return null;
  const cookieStore = await cookies();
  return createServerSupabaseClient(supabaseEnv, {
    getAll: () => cookieStore.getAll(),
    setAll: (toSet: CookieToSet[]) => {
      try {
        for (const { name, value, options } of toSet) {
          cookieStore.set(name, value, options as Record<string, unknown> | undefined);
        }
      } catch {
        // Server Component 렌더 중에는 쿠키 쓰기가 무시된다(middleware 가 갱신 담당).
      }
    },
  });
}
