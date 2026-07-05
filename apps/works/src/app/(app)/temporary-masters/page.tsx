import { PageHeader } from "@yna/ui";
import { listTemporaryMasters } from "@/lib/hub-data/service";
import { TemporaryMastersTable } from "@/components/temporary-masters/temporary-masters-table";

/**
 * 임시 마스터 목록 화면. (근거: functional_spec §14-1, information_architecture §4)
 * 정식 승격 전(TEMP 코드) 마스터를 엔티티 공통으로 모아 검토 동선을 제공한다.
 */
export default async function TemporaryMastersPage() {
  const items = await listTemporaryMasters();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="임시 마스터"
        description="정식 승격 전의 임시 마스터(TEMP)입니다. 상세에서 검증 상태 변경과 중복 후보 처리를 진행하세요."
      />
      <TemporaryMastersTable items={items} />
    </div>
  );
}
