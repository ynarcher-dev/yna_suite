import { PageHeader, StatusBadge } from "@yna/ui";

/**
 * Dev 대시보드 (자리표시자). 위젯 실제 데이터는 Phase 1.5 에서 연결한다.
 * (근거: yna_suite_information_architecture.md §5)
 */
const STATS = [
  { label: "전체 사용자", value: "—", tone: "neutral" as const },
  { label: "활성 계정", value: "—", tone: "success" as const },
  { label: "만료 예정 권한", value: "—", tone: "warning" as const },
  { label: "외부 사용자", value: "—", tone: "info" as const },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="대시보드" description="계정, 권한, scope, 감사의 현황을 관리합니다." />
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{s.label}</p>
              <StatusBadge tone={s.tone}>대기</StatusBadge>
            </div>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{s.value}</p>
          </div>
        ))}
      </section>
      <p className="text-sm text-gray-500">
        Phase 1.2 공통 디자인 시스템 · AppShell 적용 화면입니다. 사용자·권한 관리 화면은 Phase 1.5
        에서 구현됩니다.
      </p>
    </div>
  );
}
