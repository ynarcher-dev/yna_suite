import type { ImportSummary } from "@/lib/hub-data/types";

/**
 * import 검증 리포트 요약(신규/연결/후보/실패 수). (근거: migration_strategy §14, functional_spec §14)
 * 순수 표현 컴포넌트 — dry-run 리포트와 batch 상세에서 공용으로 쓴다.
 */
const ITEMS: { key: keyof ImportSummary; label: string }[] = [
  { key: "newMasters", label: "신규 생성" },
  { key: "linkedMasters", label: "기존 연결" },
  { key: "candidateMasters", label: "후보 검토" },
  { key: "mergeCandidates", label: "중복 후보" },
  { key: "failedRows", label: "실패" },
];

export function ImportSummaryCards({ summary }: { summary: ImportSummary }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {ITEMS.map((it) => (
        <div key={it.key} className="rounded-md border border-gray-200 bg-gray-25 px-3 py-2">
          <div className="text-xs text-gray-500">{it.label}</div>
          <div className="tabular-nums text-lg font-semibold text-gray-800">{summary[it.key]}</div>
        </div>
      ))}
    </div>
  );
}
