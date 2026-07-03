import { DOMAINS, type Domain, type PermissionMap } from "@yna/core";
import { accessibleDomains } from "@yna/permissions";
import { APP_CONFIGS } from "@yna/config";
import type { ServiceLink } from "@yna/ui";

/**
 * 권한이 있는(읽기 이상) 서비스만 Topbar 스위처 항목으로 만든다.
 * (근거: yna_suite_information_architecture.md §12 — 권한 없는 서비스 메뉴 미노출)
 *
 * 로컬 개발에서는 각 서비스 localPort 로, 운영에서는 host 로 연결한다.
 * (실제 base URL 은 Phase 1.4 인증/환경 배선에서 env 기준으로 정리)
 */
export function buildServiceLinks(permissions: PermissionMap, current: Domain): ServiceLink[] {
  const isLocal = process.env.NODE_ENV !== "production";
  return accessibleDomains(permissions, DOMAINS).map((domain): ServiceLink => {
    const cfg = APP_CONFIGS[domain];
    return {
      key: domain,
      label: cfg.appName,
      href: isLocal ? `http://localhost:${cfg.localPort}` : `https://${cfg.host}`,
      current: domain === current,
    };
  });
}
