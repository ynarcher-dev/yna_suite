import Link from "next/link";
import { DOMAINS } from "@yna/core";
import {
  PageHeader,
  PermissionBadge,
  Table,
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "@yna/ui";
import { listUsers } from "@/lib/dev-data/service";
import { DOMAIN_SHORT, domainLevel } from "@/lib/dev-data/display";

/**
 * 권한 매트릭스. (근거: functional_spec §17)
 * 사용자×도메인 권한을 한눈에 보여주고, 실제 변경(전/후 diff)은 사용자 상세에서 처리한다.
 */
export default async function PermissionMatrixPage() {
  const users = await listUsers();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="권한 매트릭스"
        description="사용자별 도메인 권한 현황입니다. 변경은 사용자 상세에서 사유·감사와 함께 처리됩니다."
      />
      <Table>
        <THead>
          <TR>
            <TH>사용자</TH>
            {DOMAINS.map((d) => (
              <TH key={d}>{DOMAIN_SHORT[d]}</TH>
            ))}
          </TR>
        </THead>
        <TBody>
          {users.map((u) => (
            <TR key={u.id}>
              <TD className="whitespace-nowrap font-medium text-gray-900">
                <Link href={`/users/${u.id}`} className="hover:text-brand hover:underline">
                  {u.name}
                </Link>
              </TD>
              {DOMAINS.map((d) => (
                <TD key={d}>
                  <PermissionBadge level={domainLevel(u.permissions, d)} />
                </TD>
              ))}
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
