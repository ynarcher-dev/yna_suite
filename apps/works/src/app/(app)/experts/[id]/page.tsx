import { notFound } from "next/navigation";
import { getExpertDetail } from "@/lib/hub-data/service";
import { ExpertDetailView } from "@/components/experts/expert-detail-view";

/**
 * 전문가 마스터 상세 화면. (근거: functional_spec §8)
 */
export default async function ExpertDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getExpertDetail(id);
  if (!detail) notFound();
  return <ExpertDetailView detail={detail} />;
}
