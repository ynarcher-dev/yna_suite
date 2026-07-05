"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  EmptyState,
  StatusBadge,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@yna/ui";
import { runFlowAction } from "@/app/(app)/domain-test/actions";
import type { FlowResult, WorkApplicationView } from "@/lib/ac-mock/types";

/**
 * 도메인 연결 테스트 실행·결과 화면(Phase 1.13).
 * 실행 버튼(work 쓰기 권한) + 단계별 검증 결과 + 신청 FK resolve 현황을 표시한다.
 */
export function DomainTestView({
  canRun,
  isProduction,
  lastFlow,
  applications,
}: {
  canRun: boolean;
  isProduction: boolean;
  lastFlow: FlowResult | null;
  applications: WorkApplicationView[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    startTransition(async () => {
      const res = await runFlowAction();
      if (!res.ok) setError(res.error ?? "연결 테스트가 실패했습니다. 단계 결과를 확인하세요.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-gray-600">
            13단계 연결 시나리오를 실행합니다. 실행할 때마다 새 프로그램·임시 마스터가 생성되고, 병합
            후 신청 FK 가 최종 마스터로 resolve 되는지 검증합니다.
          </p>
          <Button onClick={run} disabled={!canRun || pending}>
            {pending ? "실행 중…" : "연결 테스트 실행"}
          </Button>
        </div>
        {isProduction && (
          <p className="text-sm text-gray-500">
            이 기능은 staging/dev 에서만 사용합니다. production 에서는 비활성화됩니다.
          </p>
        )}
        {!canRun && !isProduction && (
          <p className="text-sm text-gray-500">
            실행에는 work 도메인 쓰기 권한이 필요합니다.
          </p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {lastFlow ? (
        <FlowSteps result={lastFlow} />
      ) : (
        <EmptyState
          title="아직 실행 기록이 없습니다"
          description="‘연결 테스트 실행’으로 Work 연결 계약을 자동 검증하세요."
        />
      )}

      <ApplicationsTable applications={applications} />
    </div>
  );
}

function FlowSteps({ result }: { result: FlowResult }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge tone={result.ok ? "success" : "danger"}>
          {result.ok ? "통과" : "실패"}
        </StatusBadge>
        <span className="text-sm text-gray-500">
          {result.actorName} · {new Date(result.ranAt).toLocaleString("ko-KR")}
        </span>
      </div>
      <Table>
        <THead>
          <TR>
            <TH>#</TH>
            <TH>단계</TH>
            <TH>결과</TH>
            <TH>상세</TH>
          </TR>
        </THead>
        <TBody>
          {result.steps.map((s) => (
            <TR key={s.seq}>
              <TD className="tabular-nums text-gray-500">{s.seq}</TD>
              <TD className="text-gray-800">{s.label}</TD>
              <TD>
                <StatusBadge tone={s.ok ? "success" : "danger"}>
                  {s.ok ? "OK" : "실패"}
                </StatusBadge>
              </TD>
              <TD className="text-xs text-gray-500">{s.detail}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}

function ApplicationsTable({ applications }: { applications: WorkApplicationView[] }) {
  if (applications.length === 0) {
    return (
      <EmptyState
        title="Mock 신청이 없습니다"
        description="연결 테스트를 실행하면 Hub 마스터에 연결된 mock 신청이 생성됩니다."
      />
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-gray-700">
        Mock 신청 → 최종 마스터 resolve 현황
      </h2>
      <Table>
        <THead>
          <TR>
            <TH>신청</TH>
            <TH>연결 id(보존)</TH>
            <TH>최종 마스터(resolve)</TH>
            <TH>상태</TH>
          </TR>
        </THead>
        <TBody>
          {applications.map((a) => (
            <TR key={a.id}>
              <TD className="text-gray-800">{a.applicantName}</TD>
              <TD className="font-mono text-xs text-gray-500">{a.startupId}</TD>
              <TD className="text-xs text-gray-700">
                {a.resolvedMasterCode ?? a.resolvedStartupId}
                {a.resolvedMasterName ? ` · ${a.resolvedMasterName}` : ""}
              </TD>
              <TD>
                <StatusBadge tone={a.merged ? "info" : "neutral"}>
                  {a.merged ? "병합 귀속" : "직접 연결"}
                </StatusBadge>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
