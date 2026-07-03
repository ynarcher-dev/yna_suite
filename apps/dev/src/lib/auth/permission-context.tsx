"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Domain, PermissionMap } from "@yna/core";
import { canRead, canWrite } from "@yna/permissions";

/**
 * 현재 세션 권한을 클라이언트 트리에 제공한다.
 * 페이지/컴포넌트는 usePermissions 로 쓰기 버튼 노출·읽기 전용 배너를 결정한다.
 * (근거: yna_suite_auth_permissions.md §8 — UI 권한 처리는 UX, 최종 강제는 RLS)
 */
interface PermissionContextValue {
  permissions: PermissionMap;
  /** 이 앱이 소유한 도메인. */
  domain: Domain;
  canReadCurrent: boolean;
  canWriteCurrent: boolean;
}

const PermissionContext = createContext<PermissionContextValue | null>(null);

export function PermissionProvider({
  permissions,
  domain,
  children,
}: {
  permissions: PermissionMap;
  domain: Domain;
  children: ReactNode;
}) {
  const value = useMemo<PermissionContextValue>(
    () => ({
      permissions,
      domain,
      canReadCurrent: canRead(permissions, domain),
      canWriteCurrent: canWrite(permissions, domain),
    }),
    [permissions, domain],
  );
  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function usePermissions(): PermissionContextValue {
  const ctx = useContext(PermissionContext);
  if (!ctx) throw new Error("usePermissions must be used within PermissionProvider");
  return ctx;
}
