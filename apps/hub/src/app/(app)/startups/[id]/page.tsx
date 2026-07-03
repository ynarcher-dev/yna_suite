import { notFound } from "next/navigation";
import { getStartupDetail } from "@/lib/hub-data/service";
import { StartupDetailView } from "@/components/startups/startup-detail-view";

/**
 * 스타트업 마스터 상세 화면. (근거: functional_spec §7, api_contracts §8)
 * 서버에서 상세를 조회하고, 수정/식별자/별칭/상태 액션은 클라이언트 뷰가 담당한다.
 */
export default async function StartupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getStartupDetail(id);
  if (!detail) notFound();
  return <StartupDetailView detail={detail} />;
}
