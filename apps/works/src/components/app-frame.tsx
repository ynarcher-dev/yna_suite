"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppShell, NoPermissionScreen, ReadOnlyBanner, type ShellUser } from "@yna/ui";
import type { PermissionMap } from "@yna/core";
import { canRead, canWrite } from "@yna/permissions";
import { APP_CONFIGS, SECTION_CONFIGS } from "@yna/config";
import { buildWorksNav } from "@/lib/nav";
import { buildSectionLinks, sectionOfPath } from "@/lib/services";
import { PermissionProvider } from "@/lib/auth/permission-context";

const app = APP_CONFIGS.works;

/**
 * Y&ARCHER WORKS 앱 프레임. 하나의 AppShell 안에서 HUB·관리(ADMIN) 등 섹션을 담는다.
 * (근거: yna_suite_information_architecture.md §1·§2, auth_permissions.md §7·§8)
 *
 * 현재 경로로 섹션을 판정해 그 섹션의 도메인 권한(read/write)으로 게이트한다.
 * 세션/권한은 서버(layout)에서 JWT 로 판정해 주입한다. 여기서는 표현만 담당한다.
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
  const section = sectionOfPath(pathname);
  const sections = buildWorksNav(permissions);
  const sectionLinks = buildSectionLinks(permissions, section);

  // 현재 섹션 읽기 권한이 없으면 콘텐츠 대신 접근 불가 화면.
  if (!canRead(permissions, section)) {
    return (
      <AppShell serviceName={app.appName} sections={[]} user={user} linkComponent={Link}>
        <NoPermissionScreen />
      </AppShell>
    );
  }

  const readOnly = !canWrite(permissions, section);

  return (
    <AppShell
      serviceName={`${app.appName} · ${SECTION_CONFIGS[section].label}`}
      sections={sections}
      activeHref={pathname}
      user={user}
      services={sectionLinks}
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
      <PermissionProvider permissions={permissions} domain={section}>
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
