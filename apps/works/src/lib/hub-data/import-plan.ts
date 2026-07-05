import { normalizeBusinessNumber, normalizeCompanyName } from "@yna/utils";
import {
  applyColumnMapping,
  classifyAgainst,
  STARTUP_IMPORT_MAPPING,
  type ComparableMaster,
} from "@yna/master-data";
import { normalizeIdentifierValue, normalizePersonName } from "./masters";
import type { ImportDecisionKind, ImportSummary } from "./types";

/**
 * import row 판정(순수, 스토어 비의존). (근거: migration_strategy §7~9·16)
 *
 * 원본 row → 컬럼 매핑 → 정규화 비교필드 → (필수/형식 검증) → 기존 마스터 대비 분류.
 * dry-run 과 실제 실행이 같은 판정을 쓰도록 스토어를 건드리지 않고 existing 을 주입받는다.
 * 정규화·분류는 @yna/master-data / hub-data(masters) 공통 함수를 재사용한다(migration_strategy §17).
 */

export interface ExistingComparable {
  id: string;
  comparable: ComparableMaster;
}

export interface PlannedRow {
  sourceRowNumber: number | null;
  raw: Record<string, unknown>;
  mapped: Record<string, string>;
  preserved: Record<string, unknown>;
  normalized: Record<string, string | null>;
  displayName: string;
  decisionKind: ImportDecisionKind;
  status: "processed" | "failed";
  /** connect/candidate 대상 마스터 id. */
  targetId: string | null;
  score: number;
  errorMessage: string | null;
}

/** 매핑된 표준 필드에서 정규화 비교 필드를 조립한다(임시 생성 경로와 동일 규칙). */
export function comparableFromMapped(mapped: Record<string, string>): ComparableMaster {
  const name = mapped.name ?? mapped.team_name ?? "";
  return {
    normalizedName: normalizeCompanyName(name),
    representativeName: normalizePersonName(mapped.representative_name ?? null),
    businessNumber: mapped.business_number
      ? normalizeIdentifierValue("business_number", mapped.business_number)
      : null,
    corporationNumber: mapped.corporation_number
      ? normalizeIdentifierValue("corporation_number", mapped.corporation_number)
      : null,
    phone: mapped.phone ? normalizeIdentifierValue("founder_phone", mapped.phone) : null,
    email: mapped.email ? normalizeIdentifierValue("founder_email", mapped.email) : null,
    websiteDomain: mapped.website_url
      ? normalizeIdentifierValue("website_domain", mapped.website_url)
      : null,
  };
}

function toNormalizedPayload(c: ComparableMaster): Record<string, string | null> {
  return {
    name: c.normalizedName || null,
    representative_name: c.representativeName ?? null,
    business_number: c.businessNumber ?? null,
    corporation_number: c.corporationNumber ?? null,
    phone: c.phone ?? null,
    email: c.email ?? null,
    website_domain: c.websiteDomain ?? null,
  };
}

/** 단일 row 판정(순수). 필수/형식 검증 → 실패, 통과하면 기존 마스터 대비 분류. */
export function planRow(
  raw: Record<string, unknown>,
  sourceRowNumber: number | null,
  existing: ExistingComparable[],
): PlannedRow {
  const { mapped: partial, preserved } = applyColumnMapping(raw, STARTUP_IMPORT_MAPPING);
  const mapped = partial as Record<string, string>;
  const comparable = comparableFromMapped(mapped);
  const base = {
    sourceRowNumber,
    raw,
    mapped,
    preserved,
    normalized: toNormalizedPayload(comparable),
    displayName: mapped.name ?? mapped.team_name ?? "(이름 없음)",
  };
  const fail = (errorMessage: string): PlannedRow => ({
    ...base,
    decisionKind: "failed",
    status: "failed",
    targetId: null,
    score: 0,
    errorMessage,
  });

  if (!mapped.name && !mapped.team_name) {
    return fail("회사명(name) 또는 팀명(team_name)이 필요합니다.");
  }
  if (mapped.business_number && normalizeBusinessNumber(mapped.business_number).length !== 10) {
    return fail("사업자번호 형식이 올바르지 않습니다(숫자 10자리).");
  }

  const cls = classifyAgainst(comparable, existing);
  return {
    ...base,
    decisionKind: cls.kind,
    status: "processed",
    targetId: cls.targetId,
    score: cls.score,
    errorMessage: null,
  };
}

/**
 * 여러 row 를 순차 판정한다. 배치 안에서 먼저 생성될 마스터(new/candidate)를 가상 후보로 누적해,
 * 같은 배치의 중복 row 가 뒤에서 candidate 로 잡히게 한다(운영 실행과 동일한 순차 반영).
 */
export function planRows(
  rawRows: Record<string, unknown>[],
  existing: ExistingComparable[],
): PlannedRow[] {
  const working = [...existing];
  const out: PlannedRow[] = [];
  let virtualSeq = 0;
  for (let i = 0; i < rawRows.length; i++) {
    const plan = planRow(rawRows[i]!, i + 1, working);
    out.push(plan);
    if (plan.status === "processed" && plan.decisionKind !== "connect") {
      working.push({ id: `plan-${++virtualSeq}`, comparable: comparableFromMapped(plan.mapped) });
    }
  }
  return out;
}

/** 판정 결과를 검증 리포트 요약으로 집계한다(dry-run 추정: 후보 수 ≈ candidate row 수). */
export function summarizePlans(plans: PlannedRow[]): ImportSummary {
  let newMasters = 0;
  let linkedMasters = 0;
  let candidateMasters = 0;
  let failedRows = 0;
  for (const p of plans) {
    if (p.decisionKind === "connect") linkedMasters += 1;
    else if (p.decisionKind === "candidate") candidateMasters += 1;
    else if (p.decisionKind === "new_master") newMasters += 1;
    else failedRows += 1;
  }
  return {
    newMasters,
    linkedMasters,
    candidateMasters,
    mergeCandidates: candidateMasters,
    failedRows,
    needsReview: candidateMasters,
  };
}
