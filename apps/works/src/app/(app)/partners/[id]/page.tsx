import { notFound } from "next/navigation";
import { getPartnerDetail } from "@/lib/hub-data/service";
import { PartnerDetailView } from "@/components/partners/partner-detail-view";

/**
 * 협력사 마스터 상세 화면. (근거: functional_spec §9)
 */
export default async function PartnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getPartnerDetail(id);
  if (!detail) notFound();
  return <PartnerDetailView detail={detail} />;
}
