import type { Domain } from "@yna/core";

/**
 * 서비스별 배포/도메인/로컬 포트 설정.
 * (근거: yna_suite_foldering.md §1, yna_suite_environment_deployment.md §8)
 */
export interface AppConfig {
  domain: Domain;
  /** 사용자에게 보이는 이름. */
  appName: string;
  /** 운영 서브도메인. */
  host: string;
  /** 로컬 개발 포트. */
  localPort: number;
}

export const APP_CONFIGS: Record<Domain, AppConfig> = {
  hub: { domain: "hub", appName: "Y&A Hub", host: "hub.ynarcher.co.kr", localPort: 3000 },
  dev: { domain: "dev", appName: "Y&A Dev", host: "dev.ynarcher.co.kr", localPort: 3001 },
  work: { domain: "work", appName: "Y&A Work", host: "work.ynarcher.co.kr", localPort: 3002 },
  mna: { domain: "mna", appName: "Y&A M&A", host: "mna.ynarcher.co.kr", localPort: 3003 },
  project: {
    domain: "project",
    appName: "Y&A Project",
    host: "project.ynarcher.co.kr",
    localPort: 3004,
  },
  fund: { domain: "fund", appName: "Y&A Fund", host: "fund.ynarcher.co.kr", localPort: 3005 },
  management: {
    domain: "management",
    appName: "Y&A Management",
    host: "management.ynarcher.co.kr",
    localPort: 3006,
  },
};
