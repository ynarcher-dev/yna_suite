import { notFound } from "next/navigation";
import { PageHeader } from "@yna/ui";
import { getImportBatchDetail } from "@/lib/hub-data/service";
import { ImportBatchDetailView } from "@/components/import/import-batch-detail-view";

/**
 * Import Batch 상세(성공/실패 요약·신규/연결/후보 수·실패 사유·rollback) 화면.
 * (근거: functional_spec §14, migration_strategy §14~15)
 */
export default async function ImportBatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getImportBatchDetail(id);
  if (!detail) notFound();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Import Batch 상세" description={detail.batch.sourceName} />
      <ImportBatchDetailView detail={detail} />
    </div>
  );
}
