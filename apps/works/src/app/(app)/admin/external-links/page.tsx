import { PageHeader } from "@yna/ui";
import { listUsers } from "@/lib/admin-data/service";
import { ExternalLinksTable } from "@/components/admin/external-links-table";

/**
 * 외부 사용자 연결 화면. (근거: functional_spec §19)
 * 외부 사용자는 반드시 대상 마스터와 연결되며 Hub/Dev 직접 접근이 없다.
 */
export default async function ExternalLinksPage() {
  const users = await listUsers();
  const external = users.filter((u) => u.isExternal);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="외부 사용자 연결"
        description="guest_startup/guest_expert 사용자와 대상 마스터의 연결을 관리합니다."
      />
      <ExternalLinksTable users={external} />
    </div>
  );
}
