import Link from "next/link";
import { EmptyState, MasterCodeBadge, StatusBadge } from "@yna/ui";
import { ENTITY_LABEL, verificationMeta } from "@/lib/hub-data/display";
import type { MasterSearchResult } from "@/lib/hub-data/types";

/**
 * 통합 검색 결과 목록. (근거: functional_spec §5)
 * 스타트업만 상세가 구현되어 있어 링크로 이동하고, 전문가/협력사는 Phase 1.7 에서 연결한다.
 */
export function SearchResults({ results, hasQuery }: { results: MasterSearchResult[]; hasQuery: boolean }) {
  if (!hasQuery) {
    return (
      <EmptyState
        title="검색어를 입력하세요"
        description="회사명·법인명·별칭·대표자명·사업자번호로 스타트업/전문가/협력사를 찾습니다."
      />
    );
  }
  if (results.length === 0) {
    return <EmptyState title="결과가 없습니다" description="다른 검색어나 필터를 시도하세요." />;
  }
  return (
    <ul className="flex flex-col gap-2">
      {results.map((r) => {
        const v = verificationMeta(r.verificationStatus);
        const inner = (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-gray-900">{r.name}</span>
                <MasterCodeBadge code={r.masterCode} />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                {ENTITY_LABEL[r.entityType]}
                {r.matchedFields.length > 0 && <> · 일치: {r.matchedFields.join(", ")}</>}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <StatusBadge tone={v.tone}>{v.label}</StatusBadge>
              <span className="w-10 text-right text-xs tabular-nums text-gray-500">
                {Math.round(r.score)}
              </span>
            </div>
          </div>
        );
        return (
          <li key={`${r.entityType}-${r.id}`}>
            {r.entityType === "startup" ? (
              <Link
                href={`/startups/${r.id}`}
                className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                {inner}
              </Link>
            ) : (
              inner
            )}
          </li>
        );
      })}
    </ul>
  );
}
