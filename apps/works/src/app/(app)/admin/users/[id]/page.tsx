import { notFound } from "next/navigation";
import { getUser, listAuditLogs } from "@/lib/admin-data/service";
import { UserDetail } from "@/components/admin/user-detail";

/**
 * 사용자 상세 화면. (근거: functional_spec §16)
 */
export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser(id);
  if (!user) notFound();

  const audit = await listAuditLogs();
  const history = audit.filter((a) => a.targetName === user.name);

  return <UserDetail user={user} history={history} />;
}
