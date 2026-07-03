"use server";

import { revalidatePath } from "next/cache";
import type { Domain, RoleTemplate } from "@yna/core";
import {
  applyOverrides,
  diffPermissions,
  externalLinkGrant,
  isMasterLevelChange,
  isMasterRole,
  permissionsFromRole,
  type PermissionInput,
  validatePermissionInput,
} from "@yna/permissions";
import { getSession } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/auth/env";
import { mockGetUser, mockInviteUser, mockSetStatus, mockUpdatePermissions } from "./mock-store";
import type { ActionResult, UserStatus } from "./types";

/**
 * Dev 권한 변경 서버 액션.
 * (근거: yna_suite_api_contracts.md §17~18, functional_spec §16 안전장치)
 *
 * 안전장치: can_write→can_read 강제, 과거 expires_at 거부, master 수준 변경은 확인 필요,
 * 변경 사유(reason) 필수, before/after 를 감사 로그에 기록.
 * 최종 보안은 RLS. 이 액션은 dev 폴백에서 mock 스토어를 갱신한다(운영은 이슈19에서 연결).
 */

async function actorName(): Promise<string> {
  const session = await getSession();
  return session?.shellUser.name ?? "알 수 없음";
}

function guardConfigured(): ActionResult | null {
  if (isSupabaseConfigured) {
    return {
      ok: false,
      error: "권한 변경의 Supabase 연동은 Docker/staging 에서 연결 예정입니다(이슈19).",
    };
  }
  return null;
}

export async function saveUserPermissions(args: {
  userId: string;
  /** 도메인별 목표 권한. null = 접근 제거, 생략 = 유지. */
  overrides: Partial<Record<Domain, PermissionInput | null>>;
  reason: string;
  confirmedMaster?: boolean;
}): Promise<ActionResult> {
  const blocked = guardConfigured();
  if (blocked) return blocked;

  if (!args.reason.trim()) return { ok: false, error: "변경 사유를 입력하세요." };

  const user = mockGetUser(args.userId);
  if (!user) return { ok: false, error: "사용자를 찾을 수 없습니다." };

  for (const input of Object.values(args.overrides)) {
    if (!input) continue;
    const err = validatePermissionInput(input);
    if (err) return { ok: false, error: err.message };
  }

  const before = user.permissions;
  const after = applyOverrides(before, args.overrides);

  if (isMasterLevelChange(before, after) && !args.confirmedMaster) {
    return { ok: false, needsMasterConfirm: true, error: "master 수준 권한 변경은 확인이 필요합니다." };
  }

  const changes = diffPermissions(before, after).map((c) => ({
    action: "update" as const,
    domain: c.domain,
    before: c.before,
    after: c.after,
    reason: args.reason.trim(),
  }));
  if (changes.length === 0) return { ok: false, error: "변경된 내용이 없습니다." };

  mockUpdatePermissions(args.userId, after, null, changes, await actorName());
  revalidatePaths(args.userId);
  return { ok: true };
}

export async function applyTemplateToUser(args: {
  userId: string;
  role: RoleTemplate;
  reason: string;
  confirmedMaster?: boolean;
}): Promise<ActionResult> {
  const blocked = guardConfigured();
  if (blocked) return blocked;
  if (!args.reason.trim()) return { ok: false, error: "변경 사유를 입력하세요." };

  const user = mockGetUser(args.userId);
  if (!user) return { ok: false, error: "사용자를 찾을 수 없습니다." };

  const before = user.permissions;
  const after = permissionsFromRole(args.role);

  if ((isMasterRole(args.role) || isMasterLevelChange(before, after)) && !args.confirmedMaster) {
    return { ok: false, needsMasterConfirm: true, error: "master 템플릿 적용은 확인이 필요합니다." };
  }

  const changes = diffPermissions(before, after).map((c) => ({
    action: "apply_template" as const,
    domain: c.domain,
    before: c.before,
    after: c.after,
    reason: args.reason.trim(),
  }));

  mockUpdatePermissions(args.userId, after, args.role, changes, await actorName());
  revalidatePaths(args.userId);
  return { ok: true };
}

export async function setUserStatus(args: {
  userId: string;
  status: UserStatus;
  reason: string;
}): Promise<ActionResult> {
  const blocked = guardConfigured();
  if (blocked) return blocked;
  if (!args.reason.trim()) return { ok: false, error: "변경 사유를 입력하세요." };

  const updated = mockSetStatus(args.userId, args.status, await actorName(), args.reason.trim());
  if (!updated) return { ok: false, error: "사용자를 찾을 수 없습니다." };
  revalidatePaths(args.userId);
  return { ok: true };
}

export async function inviteUser(args: {
  name: string;
  email: string;
  role: RoleTemplate;
  reason: string;
  /** 외부 사용자면 연결 마스터 id 지정. */
  externalMasterId?: string | null;
}): Promise<ActionResult> {
  const blocked = guardConfigured();
  if (blocked) return blocked;
  if (!args.name.trim() || !args.email.trim()) {
    return { ok: false, error: "이름과 이메일을 입력하세요." };
  }
  if (!args.reason.trim()) return { ok: false, error: "초대 사유를 입력하세요." };

  const isExternal = args.role === "guest_startup" || args.role === "guest_expert";
  if (isExternal && !args.externalMasterId?.trim()) {
    return { ok: false, error: "외부 사용자는 연결할 마스터(스타트업/전문가)를 지정해야 합니다." };
  }

  const permissions =
    isExternal && args.externalMasterId
      ? externalLinkGrant(
          args.role as "guest_startup" | "guest_expert",
          args.externalMasterId.trim(),
        ).permissions
      : permissionsFromRole(args.role);

  mockInviteUser({
    name: args.name.trim(),
    email: args.email.trim(),
    roleKey: args.role,
    permissions,
    isExternal,
    linkedMasterId: isExternal ? args.externalMasterId!.trim() : null,
    reason: args.reason.trim(),
    actorName: await actorName(),
  });
  revalidatePaths();
  return { ok: true };
}

export async function linkExternalUser(args: {
  userId: string;
  kind: "guest_startup" | "guest_expert";
  masterId: string;
  reason: string;
}): Promise<ActionResult> {
  const blocked = guardConfigured();
  if (blocked) return blocked;
  if (!args.masterId.trim()) return { ok: false, error: "연결할 마스터 식별자를 입력하세요." };
  if (!args.reason.trim()) return { ok: false, error: "변경 사유를 입력하세요." };

  const user = mockGetUser(args.userId);
  if (!user) return { ok: false, error: "사용자를 찾을 수 없습니다." };

  const { role, permissions } = externalLinkGrant(args.kind, args.masterId.trim());
  const changes = diffPermissions(user.permissions, permissions).map((c) => ({
    action: "link_external" as const,
    domain: c.domain,
    before: c.before,
    after: c.after,
    reason: args.reason.trim(),
  }));
  mockUpdatePermissions(args.userId, permissions, role, changes, await actorName());
  // 외부 연결 표식(mock): scope_id 로 연결 마스터가 반영됨.
  revalidatePaths(args.userId);
  return { ok: true };
}

function revalidatePaths(userId?: string): void {
  revalidatePath("/");
  revalidatePath("/users");
  revalidatePath("/permission-matrix");
  revalidatePath("/external-links");
  revalidatePath("/permission-audit-logs");
  if (userId) revalidatePath(`/users/${userId}`);
}
