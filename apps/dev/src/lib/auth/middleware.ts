import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient, type CookieToSet } from "@yna/database";
import { supabaseEnv } from "./env";

/** 인증 없이 접근 가능한 경로(로그인/콜백/정적 리소스). */
const PUBLIC_PREFIXES = ["/login", "/auth"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * 세션 쿠키 갱신 + 미인증 사용자 게이트.
 * (근거: yna_suite_auth_permissions.md §3 접근 흐름 — 세션 없으면 로그인으로 이동)
 *
 * @supabase/ssr 표준 패턴: request/response 쿠키에 바인딩한 server client 로
 * getUser() 를 호출해 access token 을 갱신한다. Supabase 미설정(dev 폴백)이면 통과.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  if (!supabaseEnv) return response; // dev 폴백: 게이트 없이 통과

  const supabase = createServerSupabaseClient(supabaseEnv, {
    getAll: () => request.cookies.getAll(),
    setAll: (toSet: CookieToSet[]) => {
      for (const { name, value } of toSet) {
        request.cookies.set(name, value);
      }
      response = NextResponse.next({ request });
      for (const { name, value, options } of toSet) {
        response.cookies.set(name, value, options as Record<string, unknown> | undefined);
      }
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
