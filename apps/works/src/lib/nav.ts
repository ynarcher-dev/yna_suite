import {
  Building2,
  FilePlus2,
  GitMerge,
  Grid3x3,
  LayoutDashboard,
  LayoutTemplate,
  Link2,
  Rocket,
  ScrollText,
  Search,
  Upload,
  Users,
  Workflow,
} from "lucide-react";
import type { NavSection } from "@yna/ui";
import type { PermissionMap } from "@yna/core";
import { canRead } from "@yna/permissions";

/**
 * Y&ARCHER WORKS 사이드바 IA. (근거: yna_suite_information_architecture.md §4~§5)
 * 섹션별 도메인 권한(read)이 있는 메뉴 그룹만 노출한다.
 * HUB 섹션은 기본 섹션(루트 경로), 관리(ADMIN) 섹션은 /admin/*.
 */
export function buildWorksNav(permissions: PermissionMap): NavSection[] {
  const sections: NavSection[] = [];

  if (canRead(permissions, "hub")) {
    sections.push(
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
    );
  }

  if (canRead(permissions, "admin")) {
    sections.push({
      title: "관리",
      items: [
        { label: "사용자", href: "/admin/users", icon: Users },
        { label: "권한 매트릭스", href: "/admin/permission-matrix", icon: Grid3x3 },
        { label: "권한 템플릿", href: "/admin/permission-templates", icon: LayoutTemplate },
        { label: "외부 사용자 연결", href: "/admin/external-links", icon: Link2 },
        { label: "권한 감사 로그", href: "/admin/permission-audit-logs", icon: ScrollText },
      ],
    });
  }

  if (canRead(permissions, "hub")) {
    sections.push({
      title: "개발/검증",
      items: [{ label: "도메인 연결 테스트", href: "/domain-test", icon: Workflow }],
    });
  }

  return sections;
}
