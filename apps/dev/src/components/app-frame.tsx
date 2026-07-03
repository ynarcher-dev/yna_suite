"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppShell, NoPermissionScreen } from "@yna/ui";
import { canRead } from "@yna/permissions";
import { APP_CONFIGS } from "@yna/config";
import { DEV_NAV } from "@/lib/nav";
import { buildServiceLinks } from "@/lib/services";
import { DEMO_PERMISSIONS, DEMO_USER } from "@/lib/demo-session";

const app = APP_CONFIGS.dev;

/**
 * Dev 앱 프레임. AppShell 에 현재 경로/Link/권한 필터 결과를 주입한다.
 * 세션/권한은 데모 자리표시자이며 Phase 1.4 에서 실제 JWT 로 교체한다.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const services = buildServiceLinks(DEMO_PERMISSIONS, "dev");

  if (!canRead(DEMO_PERMISSIONS, "dev")) {
    return (
      <AppShell serviceName={app.appName} sections={[]} user={DEMO_USER} linkComponent={Link}>
        <NoPermissionScreen />
      </AppShell>
    );
  }

  return (
    <AppShell
      serviceName={app.appName}
      sections={DEV_NAV}
      activeHref={pathname}
      user={DEMO_USER}
      services={services}
      linkComponent={Link}
    >
      {children}
    </AppShell>
  );
}
