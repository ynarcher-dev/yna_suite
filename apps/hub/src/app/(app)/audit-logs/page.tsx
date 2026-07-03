import { PageHeader } from "@yna/ui";
import { listAuditLogs } from "@/lib/hub-data/service";
import { AuditLogsTable } from "@/components/audit/audit-logs-table";

/**
 * Hub 공통 감사 로그 화면. (근거: functional_spec §16, api_contracts §5, data_model §12)
 * 마스터 변경·병합·임시 생성·민감정보 조회 등 민감 액션 이력. 로그는 수정·삭제되지 않는다.
 */
export default async function AuditLogsPage() {
  const entries = await listAuditLogs();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="감사 로그"
        description="마스터 변경·병합·민감정보 조회 등 민감 액션 이력입니다. 로그는 수정·삭제되지 않으며 개인정보 원문은 저장하지 않습니다."
      />
      <AuditLogsTable entries={entries} />
    </div>
  );
}
