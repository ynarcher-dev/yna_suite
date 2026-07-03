"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppShell, NoPermissionScreen, ReadOnlyBanner, type ShellUser } from "@yna/ui";
import type { PermissionMap } from "@yna/core";
import { canRead, canWrite } from "@yna/permissions";
import { APP_CONFIGS } from "@yna/config";
import { DEV_NAV } from "@/lib/nav";
import { buildServiceLinks } from "@/lib/services";
import { PermissionProvider } from "@/lib/auth/permission-context";

const app = APP_CONFIGS.dev;
const DOMAIN = "dev" as const;

/**
 * Dev 앱 프레임. AppShell 에 현재 경로/Link/권한 필터 결과를 주입한다.
 * (근거: yna_suite_information_architecture.md §2·12, auth_permissions.md §7·§8)
 *
 * 세션/권한은 서버(layout)에서 JWT 로 판정해 주입한다. 여기서는 표현만 담당한다.
 * Dev 는 master 계열만 접근 가능하므로 권한 없으면 접근 불가 화면을 보여준다.
 */
export function AppFrame({
  children,
  user,
  permissions,
}: {
  children: ReactNode;
  user: ShellUser;
  permissions: PermissionMap;
}) {
  const pathname = usePathname();
  const services = buildServiceLinks(permissions, DOMAIN);

  if (!canRead(permissions, DOMAIN)) {
    return (
      <AppShell serviceName={app.appName} sections={[]} user={user} linkComponent={Link}>
        <NoPermissionScreen />
      </AppShell>
    );
  }

  const readOnly = !canWrite(permissions, DOMAIN);

  return (
    <AppShell
      serviceName={app.appName}
      sections={DEV_NAV}
      activeHref={pathname}
      user={user}
      services={services}
      linkComponent={Link}
      userMenuExtra={
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="block w-full rounded-md px-3 py-2 text-left text-base text-gray-700 hover:bg-gray-50"
          >
            로그아웃
          </button>
        </form>
      }
    >
      <PermissionProvider permissions={permissions} domain={DOMAIN}>
        {readOnly ? (
          <div className="mb-4">
            <ReadOnlyBanner />
          </div>
        ) : null}
        {children}
      </PermissionProvider>
    </AppShell>
  );
}
