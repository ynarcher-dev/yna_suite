import type { Domain, PermissionMap } from "@yna/core";
import { accessibleDomains } from "@yna/permissions";
import { SECTION_CONFIGS } from "@yna/config";
import type { ServiceLink } from "@yna/ui";

/**
 * 권한이 있는(읽기 이상) 섹션만 Topbar 스위처 항목으로 만든다.
 * (근거: yna_suite_information_architecture.md §2 Section Switcher — 권한 없는 섹션 미노출)
 *
 * 2026-07-04 개편: 섹션은 별도 앱/도메인이 아니라 WORKS 앱 내부 경로다.
 * 아직 화면이 없는 섹션(ac/fund/...)은 링크를 만들지 않는다.
 */
const IMPLEMENTED_SECTIONS: Domain[] = ["hub", "admin"];

export function buildSectionLinks(permissions: PermissionMap, current: Domain): ServiceLink[] {
  return accessibleDomains(permissions, IMPLEMENTED_SECTIONS).map((domain): ServiceLink => {
    const section = SECTION_CONFIGS[domain];
    return {
      key: domain,
      label: section.label,
      href: section.basePath === "" ? "/" : section.basePath,
      current: domain === current,
    };
  });
}

/** 경로에서 현재 섹션 도메인을 판정한다. HUB가 기본 섹션(루트)이다. */
export function sectionOfPath(pathname: string): Domain {
  for (const section of Object.values(SECTION_CONFIGS)) {
    if (section.basePath !== "" && pathname.startsWith(section.basePath)) {
      return section.domain;
    }
  }
  return "hub";
}
