import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppFrame } from "@/components/app-frame";
import { getSession } from "@/lib/auth/session";

/**
 * 인증된 앱 영역 레이아웃(서버). 세션이 없으면 로그인으로 보낸다.
 * 세션 권한(JWT app_metadata 파싱 또는 dev 폴백)을 AppFrame 에 주입한다.
 * (근거: yna_suite_auth_permissions.md §3 접근 흐름)
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <AppFrame user={session.shellUser} permissions={session.user.permissions}>
      {children}
    </AppFrame>
  );
}
