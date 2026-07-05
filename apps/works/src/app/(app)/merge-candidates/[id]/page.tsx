import { notFound } from "next/navigation";
import { getMergeCandidateDetail } from "@/lib/hub-data/service";
import { MergeCandidateDetailView } from "@/components/merge/merge-candidate-detail-view";

/**
 * 중복 후보 상세(좌우 비교 + 병합 미리보기 + 승인/반려/무시/보류) 화면.
 * (근거: functional_spec §15, api_contracts §13~15, master_data_policy §10·14)
 */
export default async function MergeCandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getMergeCandidateDetail(id);
  if (!detail) notFound();
  return <MergeCandidateDetailView detail={detail} />;
}
