import { Grid3x3, LayoutDashboard, LayoutTemplate, Link2, ScrollText, Users } from "lucide-react";
import type { NavSection } from "@yna/ui";

/**
 * Y&A Dev 사이드바 IA. (근거: yna_suite_information_architecture.md §5)
 * Phase 1 필수 메뉴만 노출한다. Permission Matrix 는 복잡하면 사용자 상세 중심으로 축소.
 */
export const DEV_NAV: NavSection[] = [
  {
    items: [{ label: "대시보드", href: "/", icon: LayoutDashboard }],
  },
  {
    title: "사용자 · 권한",
    items: [
      { label: "사용자", href: "/users", icon: Users },
      { label: "권한 매트릭스", href: "/permission-matrix", icon: Grid3x3 },
      { label: "권한 템플릿", href: "/permission-templates", icon: LayoutTemplate },
    ],
  },
  {
    title: "연결 · 감사",
    items: [
      { label: "외부 사용자 연결", href: "/external-links", icon: Link2 },
      { label: "권한 감사 로그", href: "/permission-audit-logs", icon: ScrollText },
    ],
  },
];
