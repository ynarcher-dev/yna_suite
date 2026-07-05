import { describe, expect, it } from "vitest";
import { ROLE_TEMPLATES } from "@yna/core";
import { canRead, canWrite } from "./check";
import { ROLE_TEMPLATE_MATRIX, templatePermissions } from "./templates";

describe("역할 템플릿 → PermissionMap 전개", () => {
  it("master 는 전 도메인 write", () => {
    const perms = templatePermissions("master");
    expect(canWrite(perms, "hub")).toBe(true);
    expect(canWrite(perms, "admin")).toBe(true);
    expect(canWrite(perms, "management")).toBe(true);
  });

  it("business_team: work write, mna 접근 불가, hub read-only", () => {
    const perms = templatePermissions("business_team");
    expect(canWrite(perms, "ac")).toBe(true);
    expect(canRead(perms, "hub")).toBe(true);
    expect(canWrite(perms, "hub")).toBe(false);
    expect(canRead(perms, "mna")).toBe(false);
  });

  it("guest_expert 는 work read + self scope, 나머지 없음", () => {
    const perms = templatePermissions("guest_expert");
    expect(canRead(perms, "ac")).toBe(true);
    expect(canWrite(perms, "ac")).toBe(false);
    expect(perms.ac?.scope_type).toBe("self");
    expect(canRead(perms, "hub")).toBe(false);
    expect(canRead(perms, "admin")).toBe(false);
  });

  it("guest_startup 는 work write + company scope", () => {
    const perms = templatePermissions("guest_startup");
    expect(canWrite(perms, "ac")).toBe(true);
    expect(perms.ac?.scope_type).toBe("company");
    expect(canRead(perms, "hub")).toBe(false);
  });

  it("dev 접근은 master 만 (guest/내부역할 차단)", () => {
    for (const role of ROLE_TEMPLATES) {
      const perms = templatePermissions(role);
      const expected = ROLE_TEMPLATE_MATRIX[role].admin !== "none";
      expect(canRead(perms, "admin")).toBe(expected);
    }
    expect(canRead(templatePermissions("master"), "admin")).toBe(true);
    expect(canRead(templatePermissions("executive"), "admin")).toBe(false);
  });
});
