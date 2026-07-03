import { describe, expect, it } from "vitest";
import type { PermissionMap } from "@yna/core";
import { canRead, canWrite, isExpired } from "./check";

const NOW = new Date("2026-07-03T00:00:00.000Z");

describe("canWrite → canRead 강제", () => {
  it("can_write=true 이면 can_read 값과 무관하게 읽기도 허용", () => {
    const perms: PermissionMap = {
      hub: { can_read: false, can_write: true, scope_type: "global" },
    };
    expect(canRead(perms, "hub", NOW)).toBe(true);
    expect(canWrite(perms, "hub", NOW)).toBe(true);
  });
});

describe("만료 임시 권한 즉시 차단", () => {
  it("expires_at <= now 이면 read/write 모두 false", () => {
    const perms: PermissionMap = {
      work: {
        can_read: true,
        can_write: true,
        scope_type: "company",
        scope_id: "c1",
        expires_at: "2026-07-02T23:59:59.000Z",
      },
    };
    expect(isExpired(perms.work!, NOW)).toBe(true);
    expect(canRead(perms, "work", NOW)).toBe(false);
    expect(canWrite(perms, "work", NOW)).toBe(false);
  });

  it("미래 만료는 유효", () => {
    const perms: PermissionMap = {
      work: {
        can_read: true,
        can_write: false,
        scope_type: "self",
        expires_at: "2026-08-01T00:00:00.000Z",
      },
    };
    expect(canRead(perms, "work", NOW)).toBe(true);
    expect(canWrite(perms, "work", NOW)).toBe(false);
  });
});

describe("권한 없음", () => {
  it("도메인 claim 이 없으면 false", () => {
    expect(canRead({}, "fund", NOW)).toBe(false);
  });
});
