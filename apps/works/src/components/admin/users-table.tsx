"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { ROLE_TEMPLATES, type RoleTemplate } from "@yna/core";
import {
  Button,
  EmptyState,
  FilterBar,
  Input,
  Select,
  StatusBadge,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@yna/ui";
import { maskEmail } from "@yna/utils";
import { usePermissions } from "@/lib/auth/permission-context";
import { fmtDate, statusMeta } from "@/lib/admin-data/display";
import { templateDisplayName } from "@/lib/admin-data/templates";
import type { DevUser, UserStatus } from "@/lib/admin-data/types";
import { InviteDialog } from "./invite-dialog";

/**
 * 사용자 목록. (근거: functional_spec §15 — name/email/role/status/last_sign_in 컬럼,
 * 검색·역할·상태 필터, 초대, 상세 이동, 이메일 마스킹)
 * 필터는 클라이언트에서 처리하고 쓰기 권한이 있을 때만 초대 버튼을 노출한다.
 */
export function UsersTable({ users }: { users: DevUser[] }) {
  const router = useRouter();
  const { canWriteCurrent } = usePermissions();
  const [q, setQ] = useState("");
  const [role, setRole] = useState<RoleTemplate | "">("");
  const [status, setStatus] = useState<UserStatus | "">("");
  const [inviteOpen, setInviteOpen] = useState(false);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return users.filter((u) => {
      if (role && u.roleKey !== role) return false;
      if (status && u.status !== status) return false;
      if (query && !`${u.name} ${u.email}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [users, q, role, status]);

  return (
    <div className="flex flex-col gap-3">
      <FilterBar
        trailing={
          canWriteCurrent ? (
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              사용자 초대
            </Button>
          ) : (
            <span className="text-sm text-gray-500">{filtered.length}명</span>
          )
        }
      >
        <Input
          placeholder="이름·이메일 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-56"
          aria-label="사용자 검색"
        />
        <Select
          value={role}
          onChange={(e) => setRole(e.target.value as RoleTemplate | "")}
          className="w-40"
          aria-label="역할 필터"
        >
          <option value="">역할 전체</option>
          {ROLE_TEMPLATES.map((r) => (
            <option key={r} value={r}>
              {templateDisplayName(r)}
            </option>
          ))}
        </Select>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as UserStatus | "")}
          className="w-32"
          aria-label="상태 필터"
        >
          <option value="">상태 전체</option>
          <option value="active">활성</option>
          <option value="invited">초대됨</option>
          <option value="disabled">비활성</option>
        </Select>
      </FilterBar>

      {filtered.length === 0 ? (
        <EmptyState title="사용자가 없습니다" description="검색 조건을 바꾸거나 새 사용자를 초대하세요." />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>이름</TH>
              <TH>이메일</TH>
              <TH>역할</TH>
              <TH>상태</TH>
              <TH>마지막 로그인</TH>
              <TH>생성일</TH>
            </TR>
          </THead>
          <TBody>
            {filtered.map((u) => {
              const st = statusMeta(u.status);
              return (
                <TR key={u.id} interactive onClick={() => router.push(`/admin/users/${u.id}`)}>
                  <TD className="font-medium text-gray-900">
                    {u.name}
                    {u.isExternal && (
                      <span className="ml-1.5 text-xs text-gray-400">외부</span>
                    )}
                  </TD>
                  <TD className="text-gray-600">{maskEmail(u.email)}</TD>
                  <TD>{templateDisplayName(u.roleKey)}</TD>
                  <TD>
                    <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
                  </TD>
                  <TD className="text-gray-600">{fmtDate(u.lastSignInAt)}</TD>
                  <TD className="text-gray-600">{fmtDate(u.createdAt)}</TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}

      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}
