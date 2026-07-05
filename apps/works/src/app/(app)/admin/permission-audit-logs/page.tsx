import { PageHeader } from "@yna/ui";
import { listAuditLogs } from "@/lib/admin-data/service";
import { AuditLogsTable } from "@/components/admin/audit-logs-table";

/**
 * 권한 감사 로그 화면. (근거: functional_spec §16, api_contracts §5)
 */
export default async function PermissionAuditLogsPage() {
  const entries = await listAuditLogs();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="권한 감사 로그"
        description="권한 부여/회수/변경 이력입니다. 로그는 수정·삭제되지 않습니다."
      />
      <AuditLogsTable entries={entries} />
    </div>
  );
}
