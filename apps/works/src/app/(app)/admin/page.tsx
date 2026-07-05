import { PageHeader, StatusBadge } from "@yna/ui";
import { getDashboardCounts } from "@/lib/admin-data/service";

/**
 * Dev 대시보드. 계정·권한 현황 위젯을 조회한다.
 * (근거: yna_suite_information_architecture.md §5, functional_spec §15)
 */
export default async function DashboardPage() {
  const counts = await getDashboardCounts();
  const stats = [
    { label: "전체 사용자", value: counts.totalUsers, tone: "neutral" as const },
    { label: "활성 계정", value: counts.activeUsers, tone: "success" as const },
    { label: "만료 예정 권한", value: counts.expiringPermissions, tone: "warning" as const },
    { label: "외부 사용자", value: counts.externalUsers, tone: "info" as const },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="대시보드" description="계정, 권한, scope, 감사의 현황을 관리합니다." />
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{s.label}</p>
              <StatusBadge tone={s.tone}>현황</StatusBadge>
            </div>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{s.value}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
