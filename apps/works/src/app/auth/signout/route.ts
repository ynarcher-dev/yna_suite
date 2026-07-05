import { NextResponse } from "next/server";
import { getServerClient } from "@/lib/auth/server";

/** 로그아웃. 세션을 종료하고 로그인 화면으로 보낸다. */
export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await getServerClient();
  if (supabase) await supabase.auth.signOut();
  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/login`, { status: 303 });
}
