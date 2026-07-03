import { PageHeader } from "@yna/ui";
import { canWrite } from "@yna/permissions";
import { getSession } from "@/lib/auth/session";
import { publicEnv } from "@/lib/auth/env";
import { getLastFlow, listApplications } from "@/lib/work-mock/mock-store";
import { DomainTestView } from "@/components/domain-test/domain-test-view";

/**
 * 도메인 연결 테스트(Work Mock/Test Flow). (근거: phase1_scope §11, api_contracts §19)
 *
 * 실제 Work 앱을 완성하지 않고도, Work 가 붙었을 때의 핵심 흐름을 검증한다:
 * work 권한 → 프로그램/모듈 → Hub 스타트업 검색·연결 → 유사 신규 임시 마스터 → 중복 후보 →
 * 병합 승인 → 신청 FK 가 최종 마스터로 resolve → custom activity·회의록·첨부 → audit/merge event.
 * Hub 마스터를 직접 수정하지 않고 임시 마스터·병합 후보·resolved view 로 처리되는지 확인한다.
 */
export const dynamic = "force-dynamic";

export default async function DomainTestPage() {
  const session = await getSession();
  const isProduction = publicEnv?.NEXT_PUBLIC_APP_ENV === "production";
  const canRun = Boolean(session && canWrite(session.user.permissions, "work")) && !isProduction;
  const lastFlow = getLastFlow();
  const applications = listApplications();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="도메인 연결 테스트"
        description="Work 가 붙었을 때의 핵심 연결 계약을 mock 으로 자동 검증합니다. Hub 마스터를 직접 수정하지 않고, 새 대상은 임시 마스터·병합 후보 흐름을 타며, 병합 후 신청 이력이 최종 마스터로 귀속(resolved view)되는지 확인합니다."
      />
      <DomainTestView
        canRun={canRun}
        isProduction={isProduction}
        lastFlow={lastFlow}
        applications={applications}
      />
    </div>
  );
}
