import { describe, expect, it } from "vitest";
import type { PermissionMap } from "@yna/core";
import {
  applyOverrides,
  diffPermissions,
  externalLinkGrant,
  isMasterLevelChange,
  isMasterRole,
  normalizePermission,
  permissionEquals,
  scopeRequiresTarget,
  validatePermissionInput,
} from "./admin";

const NOW = new Date("2026-07-03T00:00:00.000Z");

describe("normalizePermission", () => {
  it("can_write=true 이면 can_read 를 강제한다", () => {
    const perm = normalizePermission({
      can_read: false,
      can_write: true,
      scope_type: "global",
    });
    expect(perm.can_read).toBe(true);
    expect(perm.can_write).toBe(true);
  });

  it("global/self scope 는 scope_id 를 제거한다", () => {
    expect(
      normalizePermission({
        can_read: true,
        can_write: false,
        scope_type: "global",
        scope_id: "x",
      }).scope_id,
    ).toBeNull();
    expect(
      normalizePermission({
        can_read: true,
        can_write: false,
        scope_type: "self",
        scope_id: "x",
      }).scope_id,
    ).toBeNull();
  });

  it("company scope 는 scope_id 를 유지한다", () => {
    const perm = normalizePermission({
      can_read: true,
      can_write: true,
      scope_type: "company",
      scope_id: "startup-1",
    });
    expect(perm.scope_id).toBe("startup-1");
  });

  it("빈 문자열 expires_at/scope_id 는 null 로 정리한다", () => {
    const perm = normalizePermission({
      can_read: true,
      can_write: false,
      scope_type: "company",
      scope_id: "  ",
      expires_at: "",
    });
    expect(perm.scope_id).toBeNull();
    expect(perm.expires_at).toBeNull();
  });
});

describe("scopeRequiresTarget", () => {
  it("global/self 는 대상 불필요, 나머지는 필요", () => {
    expect(scopeRequiresTarget("global")).toBe(false);
    expect(scopeRequiresTarget("self")).toBe(false);
    expect(scopeRequiresTarget("company")).toBe(true);
    expect(scopeRequiresTarget("department")).toBe(true);
  });
});

describe("validatePermissionInput", () => {
  it("과거 만료일을 거부한다", () => {
    const err = validatePermissionInput(
      { can_read: true, can_write: false, scope_type: "global", expires_at: "2026-07-02T00:00:00.000Z" },
      NOW,
    );
    expect(err?.code).toBe("expires_in_past");
  });

  it("미래 만료일은 허용한다", () => {
    const err = validatePermissionInput(
      { can_read: true, can_write: false, scope_type: "global", expires_at: "2026-07-04T00:00:00.000Z" },
      NOW,
    );
    expect(err).toBeNull();
  });

  it("company scope 인데 scope_id 가 없으면 거부한다", () => {
    const err = validatePermissionInput(
      { can_read: true, can_write: true, scope_type: "company" },
      NOW,
    );
    expect(err?.code).toBe("scope_id_required");
  });

  it("잘못된 만료일 형식을 거부한다", () => {
    const err = validatePermissionInput(
      { can_read: true, can_write: false, scope_type: "global", expires_at: "not-a-date" },
      NOW,
    );
    expect(err?.code).toBe("invalid_expires_at");
  });
});

describe("permissionEquals / diffPermissions", () => {
  it("동일 권한은 같다고 판단한다", () => {
    const a = { can_read: true, can_write: false, scope_type: "global" as const };
    const b = { can_read: true, can_write: false, scope_type: "global" as const, scope_id: null };
    expect(permissionEquals(a, b)).toBe(true);
  });

  it("변경된 도메인만 diff 로 낸다", () => {
    const before: PermissionMap = {
      hub: { can_read: true, can_write: false, scope_type: "global" },
      ac: { can_read: true, can_write: true, scope_type: "global" },
    };
    const after: PermissionMap = {
      hub: { can_read: true, can_write: true, scope_type: "global" },
      ac: { can_read: true, can_write: true, scope_type: "global" },
      fund: { can_read: true, can_write: false, scope_type: "global" },
    };
    const changes = diffPermissions(before, after);
    const domains = changes.map((c) => c.domain).sort();
    expect(domains).toEqual(["fund", "hub"]);
    const hub = changes.find((c) => c.domain === "hub");
    expect(hub?.before?.can_write).toBe(false);
    expect(hub?.after?.can_write).toBe(true);
    const fund = changes.find((c) => c.domain === "fund");
    expect(fund?.before).toBeNull();
    expect(fund?.after?.can_read).toBe(true);
  });
});

describe("master 수준 변경 판단", () => {
  it("admin write 부여는 master 수준 변경이다", () => {
    const before: PermissionMap = { hub: { can_read: true, can_write: false, scope_type: "global" } };
    const after: PermissionMap = {
      hub: { can_read: true, can_write: false, scope_type: "global" },
      admin: { can_read: true, can_write: true, scope_type: "global" },
    };
    expect(isMasterLevelChange(before, after)).toBe(true);
  });

  it("admin write 변화 없으면 master 수준 아님", () => {
    const before: PermissionMap = { admin: { can_read: true, can_write: false, scope_type: "global" } };
    const after: PermissionMap = { admin: { can_read: true, can_write: false, scope_type: "global" } };
    expect(isMasterLevelChange(before, after)).toBe(false);
  });

  it("isMasterRole 는 master 만 참", () => {
    expect(isMasterRole("master")).toBe(true);
    expect(isMasterRole("business_team")).toBe(false);
  });
});

describe("applyOverrides", () => {
  it("override 로 도메인을 덮어쓰고 null 로 제거한다", () => {
    const base: PermissionMap = {
      hub: { can_read: true, can_write: false, scope_type: "global" },
      ac: { can_read: true, can_write: true, scope_type: "global" },
    };
    const result = applyOverrides(base, {
      hub: { can_read: true, can_write: true, scope_type: "global" },
      ac: null,
    });
    expect(result.hub?.can_write).toBe(true);
    expect(result.ac).toBeUndefined();
  });
});

describe("externalLinkGrant", () => {
  it("guest_startup 은 ac company scope + startup_id, hub/admin 없음", () => {
    const { role, permissions } = externalLinkGrant("guest_startup", "startup-1");
    expect(role).toBe("guest_startup");
    expect(permissions.ac?.scope_type).toBe("company");
    expect(permissions.ac?.scope_id).toBe("startup-1");
    expect(permissions.hub).toBeUndefined();
    expect(permissions.admin).toBeUndefined();
  });

  it("guest_expert 는 ac self scope + expert_id", () => {
    const { permissions } = externalLinkGrant("guest_expert", "expert-9");
    expect(permissions.ac?.scope_type).toBe("self");
    expect(permissions.ac?.scope_id).toBe("expert-9");
    expect(permissions.hub).toBeUndefined();
  });
});
