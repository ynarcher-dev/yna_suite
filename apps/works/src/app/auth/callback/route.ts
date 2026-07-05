import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/auth/server";

/**
 * Auth 콜백. 이메일 링크/OAuth 로 받은 code 를 세션으로 교환한다.
 * (근거: yna_suite_auth_permissions.md §3 — 로그인 성공 후 원래 서비스로 redirect)
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next") ?? "/";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  if (code) {
    const supabase = await getServerClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
