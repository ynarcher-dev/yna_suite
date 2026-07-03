import { PageHeader } from "@yna/ui";
import { listExperts } from "@/lib/hub-data/service";
import { ExpertsTable } from "@/components/experts/experts-table";

/**
 * 전문가 마스터 목록 화면. (근거: functional_spec §8)
 */
export default async function ExpertsPage() {
  const experts = await listExperts();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="전문가 마스터" description="전사 전문가/멘토/평가위원 원장을 조회합니다." />
      <ExpertsTable experts={experts} />
    </div>
  );
}
