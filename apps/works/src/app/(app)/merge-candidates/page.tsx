import { PageHeader } from "@yna/ui";
import { listMergeCandidates } from "@/lib/hub-data/service";
import { MergeCandidatesTable } from "@/components/merge/merge-candidates-table";

/**
 * 중복 후보 목록 화면. (근거: functional_spec §15, api_contracts §12, master_data_policy §13~15)
 * 데이터는 서버에서 조회하고 필터(entity_type·상태·최소 점수)는 클라이언트 테이블이 담당한다.
 */
export default async function MergeCandidatesPage() {
  const candidates = await listMergeCandidates({ entityType: "all", status: "all" });
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="중복 후보"
        description="규칙 기반으로 생성된 중복 후보를 검토하고 수동으로 병합합니다. 공식 번호가 없거나 충돌하면 자동 병합하지 않습니다."
      />
      <MergeCandidatesTable candidates={candidates} />
    </div>
  );
}
