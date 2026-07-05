import { PageHeader } from "@yna/ui";
import { listStartups } from "@/lib/hub-data/service";
import { StartupsTable } from "@/components/startups/startups-table";

/**
 * 스타트업 마스터 목록 화면. (근거: functional_spec §6)
 * 데이터는 서버에서 조회하고 필터/정렬/페이지·신규 등록은 클라이언트 테이블이 담당한다.
 */
export default async function StartupsPage() {
  const startups = await listStartups();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="스타트업 마스터"
        description="전사 스타트업 원장을 조회하고 등록합니다."
      />
      <StartupsTable startups={startups} />
    </div>
  );
}
