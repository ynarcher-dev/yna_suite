import type { EntityType } from "@yna/core";
import { PARTNER_TYPES, partnerTypeLabel } from "@/lib/hub-data/display";

/**
 * 신규(임시) 마스터 등록 폼 필드 정의(엔티티별). (근거: functional_spec §6·8·9)
 * 필드 최소 집합만 받고, 정규화·식별자 파생·중복 후보는 서버 API 가 처리한다.
 */

export type CreateFormKey =
  | "name"
  | "legalName"
  | "representativeName"
  | "businessNumber"
  | "phone"
  | "email"
  | "partnerType"
  | "organization"
  | "position";

export interface CreateFieldDef {
  key: CreateFormKey;
  label: string;
  required?: boolean;
  placeholder?: string;
  type?: "text" | "select";
  options?: { value: string; label: string }[];
}

const PARTNER_TYPE_OPTIONS = PARTNER_TYPES.map((v) => ({ value: v, label: partnerTypeLabel(v) }));

export const CREATE_FIELDS: Record<Exclude<EntityType, "manager">, CreateFieldDef[]> = {
  startup: [
    { key: "name", label: "표시명", required: true, placeholder: "예: 알파테크" },
    { key: "legalName", label: "법인명" },
    { key: "representativeName", label: "대표자명" },
    { key: "businessNumber", label: "사업자번호", placeholder: "선택" },
    { key: "phone", label: "대표 연락처", placeholder: "선택" },
    { key: "email", label: "대표 이메일", placeholder: "선택" },
  ],
  expert: [
    { key: "name", label: "이름", required: true, placeholder: "예: 홍길동" },
    { key: "email", label: "이메일", placeholder: "선택" },
    { key: "phone", label: "연락처", placeholder: "선택" },
    { key: "organization", label: "소속", placeholder: "선택" },
    { key: "position", label: "직함", placeholder: "선택" },
  ],
  partner: [
    { key: "name", label: "기관명", required: true, placeholder: "예: 한국벤처투자" },
    { key: "partnerType", label: "기관유형", type: "select", options: PARTNER_TYPE_OPTIONS },
    { key: "businessNumber", label: "사업자번호", placeholder: "선택" },
    { key: "representativeName", label: "대표자명", placeholder: "선택" },
    { key: "phone", label: "대표 연락처", placeholder: "선택" },
    { key: "email", label: "대표 이메일", placeholder: "선택" },
  ],
};

export type CreateForm = Partial<Record<CreateFormKey, string>>;

/** 폼 값을 임시 마스터 생성 API body(snake_case)로 변환한다. */
export function toTemporaryBody(entityType: Exclude<EntityType, "manager">, form: CreateForm) {
  const v = (k: CreateFormKey) => {
    const t = (form[k] ?? "").trim();
    return t === "" ? null : t;
  };
  return {
    source_domain: "hub",
    name: (form.name ?? "").trim(),
    legal_name: v("legalName"),
    representative_name: v("representativeName"),
    business_number: v("businessNumber"),
    phone: v("phone"),
    email: v("email"),
    partner_type: entityType === "partner" ? v("partnerType") : null,
    organization: entityType === "expert" ? v("organization") : null,
    position: entityType === "expert" ? v("position") : null,
  };
}

/** 엔티티 상세 라우트 base. */
export const DETAIL_BASE: Record<Exclude<EntityType, "manager">, string> = {
  startup: "/startups",
  expert: "/experts",
  partner: "/partners",
};
