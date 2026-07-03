import type { Domain, PermissionMap, RoleTemplate } from "@yna/core";
import { externalLinkGrant, templatePermissions } from "@yna/permissions";
import type { DevUser, PermissionAuditEntry, UserStatus } from "./types";

/**
 * dev 폴백(Supabase 미설정) 전용 in-memory mock 스토어.
 * (근거: 4_memo 이슈17 — Docker 미설치로 실제 세션/DB 불가 → UI/배선 검증용)
 *
 * globalThis 캐시로 dev 서버 프로세스 내에서 요청/네비게이션 간 상태를 유지한다.
 * Supabase 가 설정되면 이 스토어는 사용되지 않는다(service.ts 가 실제 경로로 분기).
 * 운영/스테이징에는 노출되지 않는다(env 가 항상 설정되므로).
 */

interface MockState {
  users: DevUser[];
  audit: PermissionAuditEntry[];
  auditSeq: number;
}

function seed(): MockState {
  const users: DevUser[] = [
    mkUser("u-master", "관리자(개발)", "dev@ynarcher.com", "master", "active", "2026-06-01T09:00:00Z"),
    mkUser("u-exec", "김이사", "exec@ynarcher.com", "executive", "active", "2026-06-10T08:30:00Z"),
    mkUser("u-mgmt", "박실장", "office@ynarcher.com", "management_office", "active", "2026-06-12T10:00:00Z"),
    mkUser("u-invest", "이심사", "invest@ynarcher.com", "investment_team", "active", "2026-06-15T13:20:00Z"),
    mkUser("u-biz", "최사업", "biz@ynarcher.com", "business_team", "active", "2026-06-20T11:05:00Z"),
    mkUser("u-viewer", "정뷰어", "viewer@ynarcher.com", "viewer", "invited", null),
  ];
  // 만료 예정 임시 권한(사업팀 work) 예시.
  const biz = users.find((u) => u.id === "u-biz");
  if (biz?.permissions.work) {
    biz.permissions.work.expires_at = "2026-07-31T23:59:59Z";
  }
  // 외부 사용자 2종.
  users.push(
    mkExternal("g-startup", "알파테크 담당자", "founder@alpha.example", "guest_startup", "startup-1", "active", "2026-06-25T09:00:00Z"),
    mkExternal("g-expert", "홍멘토", "mentor@expert.example", "guest_expert", "expert-9", "invited", null),
  );
  return { users, audit: seedAudit(), auditSeq: 100 };
}

function mkUser(
  id: string,
  name: string,
  email: string,
  roleKey: RoleTemplate,
  status: UserStatus,
  lastSignInAt: string | null,
): DevUser {
  return {
    id,
    name,
    email,
    roleKey,
    status,
    lastSignInAt,
    createdAt: "2026-06-01T00:00:00Z",
    isExternal: false,
    linkedMasterId: null,
    permissions: templatePermissions(roleKey),
  };
}

function mkExternal(
  id: string,
  name: string,
  email: string,
  roleKey: "guest_startup" | "guest_expert",
  masterId: string,
  status: UserStatus,
  lastSignInAt: string | null,
): DevUser {
  const { permissions } = externalLinkGrant(roleKey, masterId);
  return {
    id,
    name,
    email,
    roleKey,
    status,
    lastSignInAt,
    createdAt: "2026-06-25T00:00:00Z",
    isExternal: true,
    linkedMasterId: masterId,
    permissions,
  };
}

function seedAudit(): PermissionAuditEntry[] {
  return [
    {
      id: "a-1",
      actorName: "관리자(개발)",
      targetName: "최사업",
      action: "apply_template",
      domain: null,
      before: null,
      after: { role: "business_team" },
      reason: "신규 사업부 직원 기본 권한 부여",
      requestId: "req_seed-a-1",
      createdAt: "2026-06-20T11:06:00Z",
    },
    {
      id: "a-2",
      actorName: "관리자(개발)",
      targetName: "알파테크 담당자",
      action: "link_external",
      domain: "work",
      before: null,
      after: { kind: "guest_startup", scope_id: "startup-1" },
      reason: "Work 신청 포털 접근 연결",
      requestId: "req_seed-a-2",
      createdAt: "2026-06-25T09:05:00Z",
    },
  ];
}

const g = globalThis as unknown as { __ynaDevMock?: MockState };
function store(): MockState {
  if (!g.__ynaDevMock) g.__ynaDevMock = seed();
  return g.__ynaDevMock;
}

// ---- reads ----

export function mockListUsers(): DevUser[] {
  return store().users.map(clone);
}

export function mockGetUser(id: string): DevUser | null {
  const u = store().users.find((x) => x.id === id);
  return u ? clone(u) : null;
}

export function mockListAudit(): PermissionAuditEntry[] {
  return [...store().audit].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

// ---- mutations ----

export interface AuditInput {
  actorName: string;
  targetId: string;
  action: string;
  domain: Domain | null;
  before: unknown;
  after: unknown;
  reason: string | null;
}

function appendAudit(input: AuditInput): void {
  const s = store();
  const target = s.users.find((u) => u.id === input.targetId);
  s.audit.push({
    id: `a-${++s.auditSeq}`,
    actorName: input.actorName,
    targetName: target?.name ?? input.targetId,
    action: input.action,
    domain: input.domain,
    before: input.before,
    after: input.after,
    reason: input.reason,
    requestId: `req_${crypto.randomUUID()}`,
    createdAt: new Date().toISOString(),
  });
}

/** 사용자 권한 맵 전체 교체 + 감사 기록. */
export function mockUpdatePermissions(
  userId: string,
  permissions: PermissionMap,
  roleKey: RoleTemplate | null,
  audits: Omit<AuditInput, "actorName" | "targetId">[],
  actorName: string,
): DevUser | null {
  const s = store();
  const user = s.users.find((u) => u.id === userId);
  if (!user) return null;
  user.permissions = permissions;
  if (roleKey) user.roleKey = roleKey;
  for (const a of audits) {
    appendAudit({ ...a, actorName, targetId: userId });
  }
  return clone(user);
}

export function mockSetStatus(
  userId: string,
  status: UserStatus,
  actorName: string,
  reason: string | null,
): DevUser | null {
  const s = store();
  const user = s.users.find((u) => u.id === userId);
  if (!user) return null;
  const before = user.status;
  user.status = status;
  appendAudit({
    actorName,
    targetId: userId,
    action: "set_status",
    domain: null,
    before: { status: before },
    after: { status },
    reason,
  });
  return clone(user);
}

export interface InviteInput {
  name: string;
  email: string;
  roleKey: RoleTemplate;
  permissions: PermissionMap;
  isExternal: boolean;
  linkedMasterId: string | null;
  reason: string | null;
  actorName: string;
}

export function mockInviteUser(input: InviteInput): DevUser {
  const s = store();
  const id = `u-${input.email.split("@")[0]}-${s.users.length + 1}`;
  const user: DevUser = {
    id,
    name: input.name,
    email: input.email,
    roleKey: input.roleKey,
    status: "invited",
    lastSignInAt: null,
    createdAt: new Date().toISOString(),
    isExternal: input.isExternal,
    linkedMasterId: input.linkedMasterId,
    permissions: input.permissions,
  };
  s.users.push(user);
  appendAudit({
    actorName: input.actorName,
    targetId: id,
    action: input.isExternal ? "invite_external" : "invite",
    domain: null,
    before: null,
    after: { role: input.roleKey, email: input.email },
    reason: input.reason,
  });
  return clone(user);
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}
