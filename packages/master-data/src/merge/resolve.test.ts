import { describe, expect, it } from "vitest";
import {
  detectMergeWarnings,
  hasBlockingConflict,
  resolveMergeField,
  resolveMergeFields,
} from "./resolve";
import type { ComparableMaster } from "./candidate";

describe("resolveMergeField", () => {
  it("target 정책은 target 우선, 없으면 source", () => {
    expect(resolveMergeField({ field: "name", policy: "target", source: "알파", target: "알파테크" })).toBe(
      "알파테크",
    );
    expect(resolveMergeField({ field: "name", policy: "target", source: "알파", target: null })).toBe("알파");
  });

  it("source 정책은 source 우선", () => {
    expect(resolveMergeField({ field: "phone", policy: "source", source: "010", target: "02" })).toBe("010");
    expect(resolveMergeField({ field: "phone", policy: "source", source: null, target: "02" })).toBe("02");
  });

  it("source_if_verified 는 검증된 source 만 채택", () => {
    const base = { field: "legalName", policy: "source_if_verified" as const, source: "주식회사 알파", target: "알파테크" };
    expect(resolveMergeField({ ...base, sourceVerified: true })).toBe("주식회사 알파");
    expect(resolveMergeField({ ...base, sourceVerified: false })).toBe("알파테크");
  });

  it("prefer_filled 는 빈 값이 아닌 쪽", () => {
    expect(resolveMergeField({ field: "address", policy: "prefer_filled", source: "서울", target: null })).toBe(
      "서울",
    );
  });

  it("union 은 두 값을 중복 제거해 합친다", () => {
    expect(
      resolveMergeField({ field: "industry", policy: "union", source: "AI, 헬스케어", target: "헬스케어, 핀테크" }),
    ).toBe("헬스케어, 핀테크, AI");
  });
});

describe("resolveMergeFields", () => {
  it("각 필드의 선택값을 계산한다", () => {
    const res = resolveMergeFields([
      { field: "name", policy: "target", source: "알파", target: "알파테크" },
      { field: "phone", policy: "source", source: "010-1", target: null },
    ]);
    expect(res.map((r) => r.selected)).toEqual(["알파테크", "010-1"]);
  });
});

describe("detectMergeWarnings / hasBlockingConflict", () => {
  const base: ComparableMaster = { normalizedName: "알파테크" };

  it("사업자번호가 다르면 blocking 충돌", () => {
    const w = detectMergeWarnings(
      { ...base, businessNumber: "1111111111" },
      { ...base, businessNumber: "2222222222" },
    );
    expect(w).toContain("business_number_conflict");
    expect(hasBlockingConflict(w)).toBe(true);
  });

  it("대표자명만 다르면 non-blocking 경고", () => {
    const w = detectMergeWarnings(
      { ...base, representativeName: "홍길동" },
      { ...base, representativeName: "김철수" },
    );
    expect(w).toEqual(["representative_name_conflict"]);
    expect(hasBlockingConflict(w)).toBe(false);
  });

  it("같은 값이면 경고 없음", () => {
    const w = detectMergeWarnings(
      { ...base, businessNumber: "1111111111", email: "a@x.com" },
      { ...base, businessNumber: "1111111111", email: "a@x.com" },
    );
    expect(w).toEqual([]);
  });
});
