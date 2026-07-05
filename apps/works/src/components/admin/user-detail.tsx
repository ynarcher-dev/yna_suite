"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ROLE_TEMPLATES, type RoleTemplate } from "@yna/core";
import {
  Button,
  PageHeader,
  Select,
  StatusBadge,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@yna/ui";
import { usePermissions } from "@/lib/auth/permission-context";
import { applyTemplateToUser, setUserStatus } from "@/lib/admin-data/actions";
import { actionLabel, fmtDateTime, statusMeta } from "@/lib/admin-data/display";
import { templateDisplayName } from "@/lib/admin-data/templates";
import type { DevUser, PermissionAuditEntry } from "@/lib/admin-data/types";
import { PermissionEditor } from "./permission-editor";
import { ReasonActionDialog } from "./reason-action-dialog";

/**
 * 사용자 상세. (근거: functional_spec §16)
 * 기본 프로필·Auth 상태·도메인 권한·권한 변경 이력 + 템플릿 적용/상태 변경 액션.
 */
export function UserDetail({ user, history }: { user: DevUser; history: PermissionAuditEntry[] }) {
  const router = useRouter();
  const { canWriteCurrent } = usePermissions();
  const [role, setRole] = useState<RoleTemplate>(user.roleKey);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const st = statusMeta(user.status);
  const nextStatus = user.status === "disabled" ? "active" : "disabled";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={user.name}
        description={user.email}
        actions={<StatusBadge tone={st.tone}>{st.label}</StatusBadge>}
      />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="역할" value={templateDisplayName(user.roleKey)} />
        <Field label="유형" value={user.isExternal ? "외부 사용자" : "내부 사용자"} />
        <Field label="연결 마스터" value={user.linkedMasterId ?? "—"} />
        <Field label="마지막 로그인" value={fmtDateTime(user.lastSignInAt)} />
      </section>

      {canWriteCurrent && (
        <section className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="apply-role" className="text-sm font-medium text-gray-700">
              권한 템플릿 적용
            </label>
            <Select
              id="apply-role"
              value={role}
              onChange={(e) => setRole(e.target.value as RoleTemplate)}
              className="w-48"
            >
              {ROLE_TEMPLATES.map((r) => (
                <option key={r} value={r}>
                  {templateDisplayName(r)}
                </option>
              ))}
            </Select>
          </div>
          <Button variant="secondary" onClick={() => setTemplateOpen(true)}>
            템플릿 적용
          </Button>
          <div className="ml-auto">
            <Button
              variant={nextStatus === "disabled" ? "danger" : "outline"}
              onClick={() => setStatusOpen(true)}
            >
              {nextStatus === "disabled" ? "사용자 비활성화" : "사용자 활성화"}
            </Button>
          </div>
        </section>
      )}

      <PermissionEditor user={user} />

      <section className="flex flex-col gap-3">
        <h2 className="text-md font-semibold text-gray-900">권한 변경 이력</h2>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500">기록된 권한 변경이 없습니다.</p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>시각</TH>
                <TH>작업</TH>
                <TH>도메인</TH>
                <TH>변경자</TH>
                <TH>사유</TH>
              </TR>
            </THead>
            <TBody>
              {history.map((h) => (
                <TR key={h.id}>
                  <TD className="whitespace-nowrap text-gray-600">{fmtDateTime(h.createdAt)}</TD>
                  <TD>{actionLabel(h.action)}</TD>
                  <TD className="text-gray-600">{h.domain ?? "—"}</TD>
                  <TD className="text-gray-600">{h.actorName}</TD>
                  <TD className="text-gray-600">{h.reason ?? "—"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </section>

      <ReasonActionDialog
        open={templateOpen}
        title="권한 템플릿 적용"
        description={`${templateDisplayName(role)} 템플릿을 적용하면 기존 도메인 권한이 대체됩니다.`}
        confirmLabel="적용"
        run={(reason, confirmedMaster) =>
          applyTemplateToUser({ userId: user.id, role, reason, confirmedMaster })
        }
        onSuccess={() => {
          setTemplateOpen(false);
          router.refresh();
        }}
        onCancel={() => setTemplateOpen(false)}
      />
      <ReasonActionDialog
        open={statusOpen}
        title={nextStatus === "disabled" ? "사용자 비활성화" : "사용자 활성화"}
        description={
          nextStatus === "disabled"
            ? "비활성화하면 해당 사용자는 로그인/접근이 차단됩니다."
            : "사용자를 다시 활성화합니다."
        }
        confirmLabel={nextStatus === "disabled" ? "비활성화" : "활성화"}
        run={(reason) => setUserStatus({ userId: user.id, status: nextStatus, reason })}
        onSuccess={() => {
          setStatusOpen(false);
          router.refresh();
        }}
        onCancel={() => setStatusOpen(false)}
      />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 truncate text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}
