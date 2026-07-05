import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/auth/middleware";

/**
 * 모든 앱 경로에서 세션 쿠키를 갱신하고 미인증 접근을 로그인으로 보낸다.
 * (정적 리소스/이미지는 matcher 에서 제외)
 */
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
