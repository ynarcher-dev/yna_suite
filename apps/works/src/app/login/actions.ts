"use server";

import { redirect } from "next/navigation";
import { getServerClient } from "@/lib/auth/server";

export interface LoginState {
  error: string | null;
}

function safeNext(next: string): string {
  // 오픈 리다이렉트 방지: 내부 경로만 허용.
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

/**
 * 이메일/비밀번호 로그인 서버 액션.
 * 성공 시 세션 쿠키가 설정되고 원래 경로로 redirect 한다.
 * (근거: yna_suite_auth_permissions.md §3 — 로그인 성공 후 원래 서비스로 redirect)
 */
export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? "/"));

  if (!email || !password) {
    return { error: "이메일과 비밀번호를 입력하세요." };
  }

  const supabase = await getServerClient();
  if (!supabase) {
    return { error: "인증 서버가 설정되지 않았습니다. 관리자에게 문의하세요." };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  redirect(next);
}
