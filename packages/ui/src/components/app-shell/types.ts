import type { LucideIcon } from "lucide-react";
import type { ElementType } from "react";

/**
 * AppShell 공통 타입. (근거: yna_suite_information_architecture.md §2·11·12)
 *
 * packages/ui 는 표현만 담당한다. 권한 기반 메뉴 노출은 소비하는 앱이
 * packages/permissions 로 필터링한 뒤, 이미 걸러진 nav/services 를 주입한다.
 */

/** 사이드바 네비게이션 항목. */
export interface NavItem {
  label: string;
  href: string;
  icon?: LucideIcon;
}

/** 사이드바 섹션(선택적 제목 + 항목들). */
export interface NavSection {
  title?: string;
  items: NavItem[];
}

/** Topbar 서비스 스위처 항목(접근 가능한 서비스만 전달). */
export interface ServiceLink {
  key: string;
  label: string;
  href: string;
  current?: boolean;
}

/** 현재 로그인 사용자 표시용 최소 정보. */
export interface ShellUser {
  name: string;
  email: string;
}

/**
 * 링크 렌더러. 기본은 <a> 지만, Next 앱은 next/link 를 주입해 SPA 네비게이션한다.
 * (packages/ui 는 next 에 의존하지 않기 위한 주입 지점)
 */
export type LinkComponent = ElementType;
