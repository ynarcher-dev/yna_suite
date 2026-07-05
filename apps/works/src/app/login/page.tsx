import Link from "next/link";
import { APP_CONFIGS } from "@yna/config";
import { StateMessage } from "@yna/ui";
import { isSupabaseConfigured } from "@/lib/auth/env";
import { LoginForm } from "./login-form";

const app = APP_CONFIGS.works;

/**
 * 로그인 화면(shell 없음). Supabase 미설정(로컬 dev 폴백)이면 안내만 표시한다.
 * (근거: yna_suite_auth_permissions.md §3, 4_memo 이슈15)
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const nextParam = sp.next;
  const next = typeof nextParam === "string" ? nextParam : "/";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-25 px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <header className="mb-6">
          <p className="text-sm text-gray-500">{app.appName}</p>
          <h1 className="mt-1 text-xl font-semibold text-gray-900">로그인</h1>
        </header>

        {isSupabaseConfigured ? (
          <LoginForm next={next} />
        ) : (
          <StateMessage
            title="개발 폴백 모드"
            description="Supabase 가 설정되지 않아 로그인 없이 개발 세션으로 동작합니다."
            action={
              <Link href="/" className="text-sm text-brand underline">
                대시보드로 이동
              </Link>
            }
          />
        )}
      </div>
    </main>
  );
}
