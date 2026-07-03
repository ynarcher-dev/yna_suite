import { clone, store, subTables } from "./mock-store";
import type { ExpertDetail, ExpertMaster, PartnerDetail, PartnerMaster } from "./types";

/**
 * 전문가/협력사 마스터 조회(mock). 공통 서브테이블 조립은 mock-store.subTables 를 재사용한다.
 * 변경은 mock-store 의 제네릭 mutation(updateMasterFields/addIdentifierRow/…)을 액션에서 직접 호출한다.
 * (근거: functional_spec §8~9, 4_memo 이슈21)
 */

// ---- experts ----

export function mockListExperts(): ExpertMaster[] {
  return store().experts.map(clone);
}

export function mockGetExpertDetail(id: string): ExpertDetail | null {
  const master = store().experts.find((x) => x.id === id);
  if (!master) return null;
  return {
    master: clone(master),
    ...subTables("expert", id),
    relatedWork: [
      { label: "서류/현장 평가", count: 0 },
      { label: "멘토링 세션", count: 0 },
    ],
  };
}

// ---- partners ----

export function mockListPartners(): PartnerMaster[] {
  return store().partners.map(clone);
}

export function mockGetPartnerDetail(id: string): PartnerDetail | null {
  const master = store().partners.find((x) => x.id === id);
  if (!master) return null;
  return {
    master: clone(master),
    ...subTables("partner", id),
    relatedWork: [
      { label: "Project", count: 0 },
      { label: "Fund", count: 0 },
      { label: "M&A", count: 0 },
    ],
  };
}
