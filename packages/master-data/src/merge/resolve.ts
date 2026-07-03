import type { ComparableMaster } from "./candidate";

/**
 * 병합 시 대표값 결정(순수 함수) + 충돌 경고 계산.
 * (근거: yna_suite_master_data_policy.md §14 병합 필드 우선순위, api_contracts §13~14)
 *
 * 병합은 단순 덮어쓰기가 아니다. 필드별 정책에 따라 대표값을 정하고,
 * 밀려난 값은 호출부에서 alias/identifier/field_history 로 보존한다.
 * 이 모듈은 "어떤 값을 대표로 고를지"의 규칙만 담당한다(엔티티별 필드/정책 매핑은 소비자가 주입).
 */

/** 필드별 대표값 결정 정책. */
export type MergeFieldPolicy =
  | "target" // 최종(잔존) 마스터 값 우선, 없으면 source
  | "source" // 병합되는(소멸) 마스터 값 우선, 없으면 target
  | "source_if_verified" // source 가 검증됨이면 source, 아니면 target
  | "prefer_filled" // 빈 값이 아닌 쪽 우선(target 우선)
  | "union"; // 두 값을 합집합(중복 제거)

export interface MergeFieldInput {
  /** 내부 필드 키(name/legalName 등). */
  field: string;
  policy: MergeFieldPolicy;
  source: string | null;
  target: string | null;
  /** source_if_verified 판단용. */
  sourceVerified?: boolean;
}

export interface MergeFieldResolution {
  field: string;
  policy: MergeFieldPolicy;
  source: string | null;
  target: string | null;
  /** 정책에 따라 선택된 대표값. */
  selected: string | null;
}

/** 콤마/배열형 값을 정규화된 토큰 배열로. */
function tokens(v: string | null): string[] {
  if (!v) return [];
  return v
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

/** 두 값의 합집합(순서 보존, 대소문자 무시 중복 제거). */
function unionValues(source: string | null, target: string | null): string | null {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of [...tokens(target), ...tokens(source)]) {
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out.length ? out.join(", ") : null;
}

/** 단일 필드의 대표값을 정책에 따라 결정한다. */
export function resolveMergeField(input: MergeFieldInput): string | null {
  const { policy, source, target } = input;
  switch (policy) {
    case "source":
      return source ?? target;
    case "source_if_verified":
      return input.sourceVerified && source ? source : (target ?? source);
    case "prefer_filled":
      return target ?? source;
    case "union":
      return unionValues(source, target);
    case "target":
    default:
      return target ?? source;
  }
}

/** 여러 필드의 대표값을 한 번에 결정한다(미리보기 field_resolution). */
export function resolveMergeFields(inputs: MergeFieldInput[]): MergeFieldResolution[] {
  return inputs.map((i) => ({
    field: i.field,
    policy: i.policy,
    source: i.source,
    target: i.target,
    selected: resolveMergeField(i),
  }));
}

/**
 * 병합 전 충돌 경고를 계산한다(정책 §13 충돌 정보).
 * 강한 식별자가 서로 다르면 병합을 막을 경고(blocking), 그 외 상충은 주의 경고.
 * @returns 경고 사유 키(화면 라벨과 동일 vocabulary)
 */
export function detectMergeWarnings(source: ComparableMaster, target: ComparableMaster): string[] {
  const warnings: string[] = [];
  const differs = (a?: string | null, b?: string | null) => Boolean(a && b && a !== b);
  if (differs(source.businessNumber, target.businessNumber)) warnings.push("business_number_conflict");
  if (differs(source.corporationNumber, target.corporationNumber))
    warnings.push("corporation_number_conflict");
  if (differs(source.representativeName, target.representativeName))
    warnings.push("representative_name_conflict");
  if (differs(source.email, target.email)) warnings.push("email_conflict");
  if (differs(source.phone, target.phone)) warnings.push("phone_conflict");
  if (differs(source.websiteDomain, target.websiteDomain)) warnings.push("website_domain_conflict");
  return warnings;
}

/** 강한 식별자(사업자/법인번호) 충돌이 있어 자동 병합/승인을 막아야 하는지. */
export function hasBlockingConflict(warnings: string[]): boolean {
  return (
    warnings.includes("business_number_conflict") ||
    warnings.includes("corporation_number_conflict")
  );
}
