"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { type Domain, DOMAINS } from "@yna/core";
import type { PermissionInput } from "@yna/permissions";
import { Button, Table, TBody, TH, THead, TR } from "@yna/ui";
import { usePermissions } from "@/lib/auth/permission-context";
import { saveUserPermissions } from "@/lib/dev-data/actions";
import type { DevUser } from "@/lib/dev-data/types";
import { DomainPermissionRow, type RowState } from "./domain-permission-row";
import { ReasonActionDialog } from "./reason-action-dialog";

/**
 * 도메인별 권한 편집기. (근거: functional_spec §16, api_contracts §17)
 * 편집 후 저장 시 사유 입력·master 확인·감사 기록(서버 액션)을 거친다.
 */
function toRow(user: DevUser, domain: Domain): RowState {
  const perm = user.permissions[domain];
  return {
    enabled: !!perm?.can_read,
    write: !!perm?.can_write,
    scopeType: perm?.scope_type ?? "global",
    scopeId: perm?.scope_id ?? "",
    expiresAt: perm?.expires_at ? new Date(perm.expires_at).toISOString().slice(0, 16) : "",
  };
}

export function PermissionEditor({ user }: { user: DevUser }) {
  const router = useRouter();
  const { canWriteCurrent } = usePermissions();
  const initial = useMemo(() => {
    const map = {} as Record<Domain, RowState>;
    for (const d of DOMAINS) map[d] = toRow(user, d);
    return map;
  }, [user]);
  const [rows, setRows] = useState<Record<Domain, RowState>>(initial);
  const [dialogOpen, setDialogOpen] = useState(false);

  const dirty = useMemo(() => JSON.stringify(rows) !== JSON.stringify(initial), [rows, initial]);

  function buildOverrides(): Partial<Record<Domain, PermissionInput | null>> {
    const overrides: Partial<Record<Domain, PermissionInput | null>> = {};
    for (const d of DOMAINS) {
      const s = rows[d];
      if (!s.enabled && !s.write) {
        overrides[d] = null;
      } else {
        overrides[d] = {
          can_read: s.enabled,
          can_write: s.write,
          scope_type: s.scopeType,
          scope_id: s.scopeId.trim() || null,
          expires_at: s.expiresAt ? new Date(s.expiresAt).toISOString() : null,
        };
      }
    }
    return overrides;
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-md font-semibold text-gray-900">도메인별 권한</h2>
        {canWriteCurrent && (
          <div className="flex items-center gap-2">
            {dirty && (
              <Button variant="ghost" size="sm" onClick={() => setRows(initial)}>
                되돌리기
              </Button>
            )}
            <Button size="sm" disabled={!dirty} onClick={() => setDialogOpen(true)}>
              변경 저장
            </Button>
          </div>
        )}
      </div>
      <Table>
        <THead>
          <TR>
            <TH>도메인</TH>
            <TH>읽기</TH>
            <TH>쓰기</TH>
            <TH>Scope</TH>
            <TH>대상</TH>
            <TH>만료일</TH>
          </TR>
        </THead>
        <TBody>
          {DOMAINS.map((d) => (
            <DomainPermissionRow
              key={d}
              domain={d}
              state={rows[d]}
              disabled={!canWriteCurrent}
              onChange={(next) => setRows((prev) => ({ ...prev, [d]: next }))}
            />
          ))}
        </TBody>
      </Table>

      <ReasonActionDialog
        open={dialogOpen}
        title="권한 변경 저장"
        description="변경된 도메인 권한을 저장하고 감사 로그에 기록합니다."
        run={(reason, confirmedMaster) =>
          saveUserPermissions({ userId: user.id, overrides: buildOverrides(), reason, confirmedMaster })
        }
        onSuccess={() => {
          setDialogOpen(false);
          router.refresh();
        }}
        onCancel={() => setDialogOpen(false)}
      />
    </section>
  );
}
