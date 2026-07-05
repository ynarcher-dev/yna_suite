import { Button, PageHeader } from "@yna/ui";
import type { EntityType } from "@yna/core";
import { searchMasters } from "@/lib/hub-data/service";
import { ENTITY_LABEL } from "@/lib/hub-data/display";
import { SearchResults } from "@/components/search/search-results";

/**
 * Hub 통합 검색. (근거: functional_spec §5, api_contracts §6)
 * 서버 컴포넌트 + 네이티브 GET 폼(무의존)으로 검색어/entity_type/병합포함을 URL 로 유지한다.
 */
type SearchParams = { q?: string; entity_type?: string; include_merged?: string };

const ENTITY_OPTIONS: (EntityType | "all")[] = ["all", "startup", "expert", "partner"];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const q = sp.q ?? "";
  const entityType = (
    ENTITY_OPTIONS.includes(sp.entity_type as EntityType) ? sp.entity_type : "all"
  ) as EntityType | "all";
  const includeMerged = sp.include_merged === "1";

  const results = q.trim() ? await searchMasters({ q, entityType, includeMerged }) : [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="통합 검색" description="스타트업·전문가·협력사 마스터를 한 곳에서 찾습니다." />

      <form method="get" className="flex flex-col gap-2 rounded-md border border-gray-200 bg-white p-2 sm:flex-row sm:items-center">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="회사명·별칭·사업자번호·대표자명"
          aria-label="검색어"
          className="h-9 flex-1 rounded-md border border-gray-300 bg-white px-3 text-base text-gray-800 placeholder:text-gray-400 focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
        />
        <select
          name="entity_type"
          defaultValue={entityType}
          aria-label="종류 필터"
          className="h-9 rounded-md border border-gray-300 bg-white px-3 text-base text-gray-800 focus-visible:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 sm:w-36"
        >
          {ENTITY_OPTIONS.map((e) => (
            <option key={e} value={e}>
              {e === "all" ? "전체" : ENTITY_LABEL[e]}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 px-1 text-sm text-gray-600">
          <input
            type="checkbox"
            name="include_merged"
            value="1"
            defaultChecked={includeMerged}
            className="h-4 w-4 rounded border-gray-300 text-brand focus-visible:ring-brand/40"
          />
          병합 포함
        </label>
        <Button type="submit">검색</Button>
      </form>

      <SearchResults results={results} hasQuery={q.trim().length > 0} />
    </div>
  );
}
