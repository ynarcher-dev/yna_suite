import {
  Building2,
  FilePlus2,
  GitMerge,
  LayoutDashboard,
  Rocket,
  ScrollText,
  Search,
  Upload,
  Users,
  Workflow,
} from "lucide-react";
import type { NavSection } from "@yna/ui";

/**
 * Y&A Hub 사이드바 IA. (근거: yna_suite_information_architecture.md §4)
 * Phase 1 필수 메뉴만 노출한다.
 */
export const HUB_NAV: NavSection[] = [
  {
    items: [
      { label: "대시보드", href: "/", icon: LayoutDashboard },
      { label: "통합 검색", href: "/search", icon: Search },
    ],
  },
  {
    title: "마스터",
    items: [
      { label: "스타트업", href: "/startups", icon: Rocket },
      { label: "전문가", href: "/experts", icon: Users },
      { label: "협력사", href: "/partners", icon: Building2 },
    ],
  },
  {
    title: "데이터 품질",
    items: [
      { label: "임시 마스터", href: "/temporary-masters", icon: FilePlus2 },
      { label: "중복 후보", href: "/merge-candidates", icon: GitMerge },
      { label: "Import Batch", href: "/import-batches", icon: Upload },
      { label: "감사 로그", href: "/audit-logs", icon: ScrollText },
    ],
  },
  {
    title: "개발/검증",
    items: [{ label: "도메인 연결 테스트", href: "/domain-test", icon: Workflow }],
  },
];
