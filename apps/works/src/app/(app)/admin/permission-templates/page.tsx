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
import { DOMAIN_SHORT, domainLevel } from "@/lib/admin-data/display";
import { listTemplateInfos } from "@/lib/admin-data/templates";

/**
 * 권한 템플릿 목록. (근거: functional_spec §18 — 초기 템플릿 8종, 조회/적용)
 * 템플릿 적용은 사용자 상세/초대에서 하고, 여기서는 기준 권한을 조회한다.
 */
export default function PermissionTemplatesPage() {
  const templates = listTemplateInfos();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="권한 템플릿"
        description="역할별 기본 도메인 권한입니다. dev.permission_templates seed 와 동일한 기준입니다."
      />
      <Table>
        <THead>
          <TR>
            <TH>템플릿</TH>
            {DOMAINS.map((d) => (
              <TH key={d}>{DOMAIN_SHORT[d]}</TH>
            ))}
          </TR>
        </THead>
        <TBody>
          {templates.map((t) => (
            <TR key={t.roleKey}>
              <TD className="whitespace-nowrap">
                <p className="font-medium text-gray-900">{t.displayName}</p>
                <p className="text-xs text-gray-500">{t.description}</p>
              </TD>
              {DOMAINS.map((d) => (
                <TD key={d}>
                  <PermissionBadge level={domainLevel(t.permissions, d)} />
                </TD>
              ))}
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
