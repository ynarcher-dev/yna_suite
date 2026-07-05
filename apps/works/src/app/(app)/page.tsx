import Link from "next/link";
import { GitMerge, Upload } from "lucide-react";
import { EmptyState, PageHeader, StatusBadge } from "@yna/ui";
import {
  getDashboardCounts,
  getRecentImportBatches,
  getRecentMergeEvents,
} from "@/lib/hub-data/service";
import { ENTITY_LABEL, fmtDate } from "@/lib/hub-data/display";
import { StatCard } from "@/components/dashboard/stat-card";

/**
 * Hub 대시보드. 전사 마스터 현황과 최근 데이터 품질 이벤트를 보여준다.
 * (근거: yna_suite_hub_admin_functional_spec.md §4, information_architecture.md §4)
 * 숫자는 mock 스토어(실 DB 대체, 이슈21) 기준으로 실제 집계된다.
 */
export default async function DashboardPage() {
  const [counts, mergeEvents, importBatches] = await Promise.all([
    getDashboardCounts(),
    getRecentMergeEvents(),
    getRecentImportBatches(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="대시보드"
        description="전사 마스터 원장 현황과 데이터 품질 상태를 한눈에 봅니다."
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="스타트업 마스터" value={counts.startups} href="/startups" />
        <StatCard label="전문가 마스터" value={counts.experts} href="/experts" />
        <StatCard label="협력사 마스터" value={counts.partners} href="/partners" />
        <StatCard label="검토 대기 마스터" value={counts.pendingMasters} href="/startups" tone="warning" />
        <StatCard
          label="검토 대기 병합"
          value={counts.pendingMergeCandidates}
          href="/merge-candidates"
          tone="warning"
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-md font-semibold text-gray-900">
            <GitMerge className="h-4 w-4 text-gray-500" aria-hidden="true" />
            최근 병합 이벤트
          </h2>
          {mergeEvents.length === 0 ? (
            <EmptyState title="최근 병합 없음" description="승인된 병합이 여기에 표시됩니다." />
          ) : (
            <ul className="flex flex-col gap-2">
              {mergeEvents.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/startups/${e.targetId}`}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 hover:border-gray-300"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-gray-800">
                        <span className="text-gray-500">{e.sourceName}</span>
                        {" → "}
                        <span className="font-medium">{e.targetName}</span>
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {ENTITY_LABEL[e.entityType]} · {fmtDate(e.createdAt)}
                      </p>
                    </div>
                    <StatusBadge tone={e.syncStatus === "completed" ? "success" : "warning"}>
                      {e.syncStatus === "completed" ? "동기화 완료" : "동기화 대기"}
                    </StatusBadge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-md font-semibold text-gray-900">
            <Upload className="h-4 w-4 text-gray-500" aria-hidden="true" />
            최근 Import Batch
          </h2>
          {importBatches.length === 0 ? (
            <EmptyState title="최근 import 없음" description="이관 작업 결과가 여기에 표시됩니다." />
          ) : (
            <ul className="flex flex-col gap-2">
              {importBatches.map((b) => (
                <li
                  key={b.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800">{b.sourceName}</p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {ENTITY_LABEL[b.entityType]} · {b.processedRows}/{b.totalRows} 처리 · 실패 {b.failedRows}
                    </p>
                  </div>
                  <StatusBadge tone={b.status === "completed" ? "success" : "warning"}>
                    {b.status === "completed" ? "완료" : "부분 완료"}
                  </StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
