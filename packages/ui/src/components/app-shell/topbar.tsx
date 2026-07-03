import * as React from "react";
import { ChevronDown, Menu } from "lucide-react";
import { cn } from "../../cn";
import { IconButton } from "../icon-button";
import type { LinkComponent, ServiceLink, ShellUser } from "./types";

export interface TopbarProps {
  serviceName: string;
  user?: ShellUser;
  services?: ServiceLink[];
  /** 모바일 drawer 열기. */
  onMenuClick?: () => void;
  linkComponent?: LinkComponent;
  /** 사용자 메뉴 하단 추가 영역(예: 로그아웃 폼). 앱이 주입한다. */
  userMenuExtra?: React.ReactNode;
  className?: string;
}

/**
 * Topbar. 56px 높이. (근거: yna_suite_design_system.md §9, IA §2)
 * 모바일 햄버거 + 서비스 스위처(접근 가능 서비스만) + 현재 사용자.
 * 드롭다운은 의존성 없이 native <details> 로 구현한다.
 */
export function Topbar({
  serviceName,
  user,
  services,
  onMenuClick,
  linkComponent,
  userMenuExtra,
  className,
}: TopbarProps) {
  const Link: LinkComponent = linkComponent ?? "a";
  return (
    <header
      className={cn(
        "flex h-14 shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-4",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <IconButton
          aria-label="메뉴 열기"
          onClick={onMenuClick}
          className="lg:hidden"
          variant="ghost"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </IconButton>
        <span className="truncate text-md font-semibold text-gray-900 lg:hidden">
          {serviceName}
        </span>
        {services && services.length > 0 && (
          <details className="group relative hidden lg:block">
            <summary className="flex cursor-pointer list-none items-center gap-1 rounded-md px-2 py-1.5 text-base font-medium text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
              서비스 전환
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
            </summary>
            <ul className="absolute left-0 z-20 mt-1 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-dropdown">
              {services.map((s) => (
                <li key={s.key}>
                  <Link
                    href={s.href}
                    aria-current={s.current ? "true" : undefined}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 text-base hover:bg-gray-50",
                      s.current ? "font-medium text-brand-700" : "text-gray-700",
                    )}
                  >
                    {s.label}
                    {s.current && <span className="text-xs text-gray-400">현재</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {user && (
        <details className="group relative">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-sm font-medium text-gray-600">
              {user.name.slice(0, 1)}
            </span>
            <span className="hidden text-left text-sm leading-tight sm:block">
              <span className="block font-medium text-gray-800">{user.name}</span>
            </span>
            <ChevronDown className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-180" />
          </summary>
          <div className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-gray-200 bg-white p-1 shadow-dropdown">
            <div className="border-b border-gray-100 px-3 py-2">
              <p className="text-sm font-medium text-gray-800">{user.name}</p>
              <p className="truncate text-xs text-gray-500">{user.email}</p>
            </div>
            <Link
              href="/account"
              className="block rounded-md px-3 py-2 text-base text-gray-700 hover:bg-gray-50"
            >
              내 계정
            </Link>
            {userMenuExtra}
          </div>
        </details>
      )}
    </header>
  );
}
