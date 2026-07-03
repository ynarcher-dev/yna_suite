import * as React from "react";
import { cn } from "../../cn";
import type { LinkComponent, NavSection } from "./types";

/** 현재 경로가 항목에 해당하는지 판정. 정확 일치 또는 하위 경로 매칭. */
function isActive(href: string, activeHref?: string): boolean {
  if (!activeHref) return false;
  if (href === activeHref) return true;
  return href !== "/" && activeHref.startsWith(`${href}/`);
}

export interface SidebarProps {
  serviceName: string;
  sections: NavSection[];
  activeHref?: string;
  linkComponent?: LinkComponent;
  /** 하단 영역(버전, 링크 등). */
  footer?: React.ReactNode;
  className?: string;
}

/**
 * Sidebar. 240px 고정 폭 네비게이션. (근거: yna_suite_design_system.md §9)
 * 배경/대형 영역에는 CI Red 를 쓰지 않고, active indicator 로만 brand 를 사용한다.
 */
export function Sidebar({
  serviceName,
  sections,
  activeHref,
  linkComponent,
  footer,
  className,
}: SidebarProps) {
  const Link: LinkComponent = linkComponent ?? "a";
  return (
    <div className={cn("flex h-full w-60 flex-col border-r border-gray-200 bg-white", className)}>
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-gray-200 px-4">
        <span className="h-4 w-1 rounded-sm bg-brand" aria-hidden="true" />
        <span className="text-md font-semibold text-gray-900">{serviceName}</span>
      </div>
      <nav className="flex-1 overflow-y-auto p-2" aria-label={`${serviceName} 메뉴`}>
        {sections.map((section, i) => (
          <div key={section.title ?? i} className="mb-2">
            {section.title && (
              <p className="px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-gray-400">
                {section.title}
              </p>
            )}
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href, activeHref);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-base font-medium transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1",
                        active
                          ? "bg-brand-50 text-brand-700"
                          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
                      )}
                    >
                      {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      {footer && <div className="shrink-0 border-t border-gray-200 p-3">{footer}</div>}
    </div>
  );
}
