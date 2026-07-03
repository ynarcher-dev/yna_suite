"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  EmptyState,
  FormField,
  Input,
  StatusBadge,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@yna/ui";
import { usePermissions } from "@/lib/auth/permission-context";
import { linkExternalUser } from "@/lib/dev-data/actions";
import { statusMeta } from "@/lib/dev-data/display";
import { templateDisplayName } from "@/lib/dev-data/templates";
import type { DevUser } from "@/lib/dev-data/types";
import { ReasonActionDialog } from "./reason-action-dialog";

/**
 * 외부 사용자 연결 관리. (근거: functional_spec §19)
 * 외부(guest) 사용자의 연결 마스터(startup_id/expert_id)를 확인·변경한다.
 * 신규 외부 사용자는 "사용자 초대"에서 guest 역할로 생성한다.
 */
export function ExternalLinksTable({ users }: { users: DevUser[] }) {
  const router = useRouter();
  const { canWriteCurrent } = usePermissions();
  const [target, setTarget] = useState<DevUser | null>(null);
  const [masterId, setMasterId] = useState("");

  if (users.length === 0) {
    return (
      <EmptyState
        title="외부 사용자가 없습니다"
        description="사용자 초대에서 guest_startup/guest_expert 역할로 외부 사용자를 만들 수 있습니다."
      />
    );
  }

  return (
    <>
      <Table>
        <THead>
          <TR>
            <TH>이름</TH>
            <TH>유형</TH>
            <TH>연결 마스터</TH>
            <TH>상태</TH>
            {canWriteCurrent && <TH>연결</TH>}
          </TR>
        </THead>
        <TBody>
          {users.map((u) => {
            const st = statusMeta(u.status);
            return (
              <TR key={u.id}>
                <TD className="font-medium text-gray-900">{u.name}</TD>
                <TD>{templateDisplayName(u.roleKey)}</TD>
                <TD className="text-gray-600">{u.linkedMasterId ?? "미연결"}</TD>
                <TD>
                  <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
                </TD>
                {canWriteCurrent && (
                  <TD>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setTarget(u);
                        setMasterId(u.linkedMasterId ?? "");
                      }}
                    >
                      연결 변경
                    </Button>
                  </TD>
                )}
              </TR>
            );
          })}
        </TBody>
      </Table>

      {target && (
        <ReasonActionDialog
          open={!!target}
          title={`${target.name} 연결 변경`}
          description={
            target.roleKey === "guest_startup"
              ? "스타트업(company scope)과 연결합니다."
              : "전문가(self scope)와 연결합니다."
          }
          confirmLabel="연결"
          extra={
            <FormField
              label={target.roleKey === "guest_startup" ? "스타트업 ID" : "전문가 ID"}
              htmlFor="link-master"
              required
            >
              <Input
                id="link-master"
                value={masterId}
                onChange={(e) => setMasterId(e.target.value)}
              />
            </FormField>
          }
          run={(reason) =>
            linkExternalUser({
              userId: target.id,
              kind: target.roleKey as "guest_startup" | "guest_expert",
              masterId,
              reason,
            })
          }
          onSuccess={() => {
            setTarget(null);
            router.refresh();
          }}
          onCancel={() => setTarget(null)}
        />
      )}
    </>
  );
}
