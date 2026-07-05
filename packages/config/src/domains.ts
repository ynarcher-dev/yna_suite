import type { Domain } from "@yna/core";

/**
 * 앱/섹션 배포 설정. (근거: yna_suite_foldering.md §1, yna_suite_environment_deployment.md)
 *
 * 2026-07-04 아키텍처 개편: 도메인별 7개 앱 → 앱 2개(WORKS 내부 통합 + GUEST 외부 포털).
 * 도메인은 이제 배포 단위가 아니라 WORKS 앱 안의 "섹션"이며, 권한으로 메뉴 노출을 제어한다.
 */

export type AppKey = "works" | "guest";

export interface AppConfig {
  key: AppKey;
  /** 사용자에게 보이는 이름. */
  appName: string;
  /** 운영 서브도메인. */
  host: string;
  /** 로컬 개발 포트. */
  localPort: number;
}

export const APP_CONFIGS: Record<AppKey, AppConfig> = {
  works: {
    key: "works",
    appName: "Y&ARCHER WORKS",
    host: "works.ynarcher.co.kr",
    localPort: 3000,
  },
  guest: {
    key: "guest",
    appName: "Y&ARCHER WORKS-GUEST",
    host: "guest.ynarcher.co.kr",
    localPort: 3001,
  },
};

/** WORKS 앱 내부 섹션(도메인)별 표시/경로 설정. */
export interface SectionConfig {
  domain: Domain;
  /** 사이드바/스위처에 보이는 섹션 이름. */
  label: string;
  /** WORKS 앱 내 기준 경로. HUB는 기본 섹션이라 루트("")를 쓴다. */
  basePath: string;
}

export const SECTION_CONFIGS: Record<Domain, SectionConfig> = {
  hub: { domain: "hub", label: "HUB", basePath: "" },
  admin: { domain: "admin", label: "관리", basePath: "/admin" },
  ac: { domain: "ac", label: "AC", basePath: "/ac" },
  mna: { domain: "mna", label: "M&A", basePath: "/mna" },
  project: { domain: "project", label: "PROJECT", basePath: "/project" },
  fund: { domain: "fund", label: "FUND", basePath: "/fund" },
  management: { domain: "management", label: "MANAGEMENT", basePath: "/management" },
};
