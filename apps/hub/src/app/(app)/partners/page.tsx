import { PageHeader } from "@yna/ui";
import { listPartners } from "@/lib/hub-data/service";
import { PartnersTable } from "@/components/partners/partners-table";

/**
 * 협력사 마스터 목록 화면. (근거: functional_spec §9)
 */
export default async function PartnersPage() {
  const partners = await listPartners();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="협력사 마스터" description="전사 협력사/자문사/LP/기관 원장을 조회합니다." />
      <PartnersTable partners={partners} />
    </div>
  );
}
