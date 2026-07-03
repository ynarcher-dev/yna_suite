"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "../../cn";
import { IconButton } from "../icon-button";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import type { LinkComponent, NavSection, ServiceLink, ShellUser } from "./types";

export interface AppShellProps {
  serviceName: string;
  sections: NavSection[];
  activeHref?: string;
  user?: ShellUser;
  services?: ServiceLink[];
  linkComponent?: LinkComponent;
  /** 사이드바 하단 영역. */
  sidebarFooter?: React.ReactNode;
  /** 사용자 메뉴 하단 추가 영역(예: 로그아웃 폼). */
  userMenuExtra?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * AppShell. Sidebar(240px) + Topbar(56px) + Content 공통 레이아웃.
 * (근거: yna_suite_design_system.md §9, yna_suite_information_architecture.md §2)
 *
 * 데스크톱은 고정 사이드바, 모바일(lg 미만)은 drawer 네비게이션.
 * 권한 기반 메뉴 노출: sections/services 는 앱이 이미 권한 필터링해 주입한다.
 */
export function AppShell({
  serviceName,
  sections,
  activeHref,
  user,
  services,
  linkComponent,
  sidebarFooter,
  userMenuExtra,
  children,
}: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  // 라우트 이동(activeHref 변경) 시 모바일 drawer 를 닫는다.
  React.useEffect(() => {
    setDrawerOpen(false);
  }, [activeHref]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-25">
      {/* 데스크톱 고정 사이드바 */}
      <aside className="hidden shrink-0 lg:block">
        <Sidebar
          serviceName={serviceName}
          sections={sections}
          activeHref={activeHref}
          linkComponent={linkComponent}
          footer={sidebarFooter}
        />
      </aside>

      {/* 모바일 drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-gray-900/40"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar
              serviceName={serviceName}
              sections={sections}
              activeHref={activeHref}
              linkComponent={linkComponent}
              footer={sidebarFooter}
            />
            <IconButton
              aria-label="메뉴 닫기"
              onClick={() => setDrawerOpen(false)}
              className="absolute right-2 top-3"
              variant="ghost"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </IconButton>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          serviceName={serviceName}
          user={user}
          services={services}
          linkComponent={linkComponent}
          userMenuExtra={userMenuExtra}
          onMenuClick={() => setDrawerOpen(true)}
        />
        <main className={cn("flex-1 overflow-y-auto px-4 py-6 sm:px-6")}>
          <div className="mx-auto w-full max-w-[1120px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
