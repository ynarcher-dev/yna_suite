import { describe, expect, it } from "vitest";
import {
  scoreDuplicateCandidate,
  shouldProposeCandidate,
  type ComparableMaster,
} from "./candidate";

const base: ComparableMaster = { normalizedName: "알파테크" };

describe("scoreDuplicateCandidate", () => {
  it("사업자번호 일치는 강한 식별자(95↑)로 본다", () => {
    const r = scoreDuplicateCandidate(
      { ...base, businessNumber: "1234567890" },
      { normalizedName: "알파", businessNumber: "1234567890" },
    );
    expect(r.conflict).toBe(false);
    expect(r.reasons).toContain("business_number_match");
    expect(r.score).toBeGreaterThanOrEqual(95);
  });

  it("사업자번호가 서로 다르면 충돌로 처리해 후보를 만들지 않는다", () => {
    const r = scoreDuplicateCandidate(
      { ...base, businessNumber: "1234567890" },
      { ...base, businessNumber: "9998887770" },
    );
    expect(r.conflict).toBe(true);
    expect(r.score).toBe(0);
    expect(shouldProposeCandidate(r)).toBe(false);
  });

  it("공식 번호 없이 이름만 같으면 약한 후보(60~79)에 머문다", () => {
    const r = scoreDuplicateCandidate(base, { normalizedName: "알파테크" });
    expect(r.reasons).toContain("normalized_name_exact");
    expect(r.score).toBe(45);
    expect(shouldProposeCandidate(r)).toBe(false); // 60 미만 → 후보 아님
  });

  it("이름+대표자+전화가 겹치면 중간 후보(80~94)로 올라가되 94 를 넘지 않는다", () => {
    const r = scoreDuplicateCandidate(
      { normalizedName: "알파테크", representativeName: "홍길동", phone: "01012345678" },
      { normalizedName: "알파테크", representativeName: "홍길동", phone: "01012345678" },
    );
    expect(r.conflict).toBe(false);
    expect(r.score).toBeLessThanOrEqual(94);
    expect(r.score).toBeGreaterThanOrEqual(80);
    expect(shouldProposeCandidate(r)).toBe(true);
  });

  it("이름이 서로 포함 관계면 유사(약함)로 잡는다", () => {
    const r = scoreDuplicateCandidate(
      { normalizedName: "주식회사알파테크" },
      { normalizedName: "알파테크" },
    );
    expect(r.reasons).toContain("normalized_name_similar");
    expect(r.score).toBe(25);
  });

  it("겹치는 단서가 없으면 0 점", () => {
    const r = scoreDuplicateCandidate(
      { normalizedName: "알파" },
      { normalizedName: "베타" },
    );
    expect(r.score).toBe(0);
    expect(r.reasons).toHaveLength(0);
  });
});
