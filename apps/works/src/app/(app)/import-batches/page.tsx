import { PageHeader } from "@yna/ui";
import { listImportBatches } from "@/lib/hub-data/service";
import { ImportBatchesTable } from "@/components/import/import-batches-table";
import { ImportRunPanel } from "@/components/import/import-run-panel";

/**
 * Import Batch 화면. (근거: functional_spec §14, migration_strategy)
 * 기존 스타트업 DB 이관 실행(dry-run→run)과 batch 목록 조회를 제공한다.
 */
export default async function ImportBatchesPage() {
  const batches = await listImportBatches();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Import Batch"
        description="기존 스타트업 DB/엑셀을 Hub 마스터로 이관합니다. dry-run 으로 검증한 뒤 실제 이관하고, batch 단위로 되돌릴 수 있습니다."
      />
      <ImportRunPanel />
      <ImportBatchesTable batches={batches} />
    </div>
  );
}
