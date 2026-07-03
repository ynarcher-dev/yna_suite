import { PageHeader } from "@yna/ui";
import { listUsers } from "@/lib/dev-data/service";
import { UsersTable } from "@/components/users/users-table";

/**
 * 사용자 목록 화면. (근거: functional_spec §15)
 * 데이터는 서버에서 조회하고 필터/초대는 클라이언트 테이블이 담당한다.
 */
export default async function UsersPage() {
  const users = await listUsers();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="사용자" description="계정과 도메인별 권한을 관리합니다." />
      <UsersTable users={users} />
    </div>
  );
}
