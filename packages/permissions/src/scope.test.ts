import { describe, expect, it } from "vitest";
import type { PermissionMap } from "@yna/core";
import { hasGlobalScope, scopeIdOf, scopeTypeOf } from "./scope";

const NOW = new Date("2026-07-03T00:00:00.000Z");

describe("scope 판단", () => {
  const perms: PermissionMap = {
    hub: { can_read: true, can_write: true, scope_type: "global" },
    ac: {
      can_read: true,
      can_write: true,
      scope_type: "company",
      scope_id: "startup-1",
    },
  };

  it("scope_type/scope_id 를 반환", () => {
    expect(scopeTypeOf(perms, "hub", NOW)).toBe("global");
    expect(scopeIdOf(perms, "hub", NOW)).toBeNull();
    expect(scopeTypeOf(perms, "ac", NOW)).toBe("company");
    expect(scopeIdOf(perms, "ac", NOW)).toBe("startup-1");
    expect(hasGlobalScope(perms, "hub", NOW)).toBe(true);
    expect(hasGlobalScope(perms, "ac", NOW)).toBe(false);
  });

  it("접근 불가 도메인은 null", () => {
    expect(scopeTypeOf(perms, "fund", NOW)).toBeNull();
    expect(scopeIdOf(perms, "fund", NOW)).toBeNull();
  });

  it("만료 임시 권한이면 scope 무효", () => {
    const expired: PermissionMap = {
      ac: {
        can_read: true,
        can_write: true,
        scope_type: "company",
        scope_id: "startup-1",
        expires_at: "2026-07-02T00:00:00.000Z",
      },
    };
    expect(scopeTypeOf(expired, "ac", NOW)).toBeNull();
    expect(scopeIdOf(expired, "ac", NOW)).toBeNull();
  });
});
