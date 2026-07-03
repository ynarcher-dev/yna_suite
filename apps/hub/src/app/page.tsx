import { PageHeader, StatusBadge } from "@yna/ui";

/**
 * Hub 대시보드 (자리표시자). 위젯 실제 데이터는 Phase 1.6 에서 연결한다.
 * (근거: yna_suite_information_architecture.md §4)
 */
const STATS = [
  { label: "스타트업 마스터", value: "—", tone: "neutral" as const },
  { label: "전문가 마스터", value: "—", tone: "neutral" as const },
  { label: "협력사 마스터", value: "—", tone: "neutral" as const },
  { label: "검토 대기 병합", value: "—", tone: "warning" as const },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="대시보드"
        description="전사 마스터 원장 현황과 데이터 품질 상태를 한눈에 봅니다."
      />
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
        Phase 1.2 공통 디자인 시스템 · AppShell 적용 화면입니다. 위젯 데이터와 세부 화면은 이후
        Phase 에서 연결됩니다.
      </p>
    </div>
  );
}
