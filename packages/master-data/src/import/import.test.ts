import { describe, expect, it } from "vitest";
import { applyColumnMapping, STARTUP_IMPORT_MAPPING } from "./mapping";
import { classifyAgainst } from "./classify";
import type { ComparableMaster } from "../merge/candidate";

describe("applyColumnMapping", () => {
  it("원본 컬럼을 표준 필드로 매핑하고 빈 값은 제외한다", () => {
    const { mapped, preserved } = applyColumnMapping(
      { 회사명: "주식회사 알파테크", 대표자: "홍길동", 사업자번호: "123-45-67890", 비고: "" },
      STARTUP_IMPORT_MAPPING,
    );
    expect(mapped.name).toBe("주식회사 알파테크");
    expect(mapped.representative_name).toBe("홍길동");
    expect(mapped.business_number).toBe("123-45-67890");
    // 매핑 안 된 컬럼(비고)은 preserved 로 보존한다.
    expect(preserved).toHaveProperty("비고");
  });

  it("매핑되지 않는 컬럼은 raw_payload(preserved) 로 보존한다", () => {
    const { mapped, preserved } = applyColumnMapping(
      { 회사명: "베타", 투자단계: "시드", 메모: "우선검토" },
      STARTUP_IMPORT_MAPPING,
    );
    expect(mapped.name).toBe("베타");
    expect(preserved).toEqual({ 투자단계: "시드", 메모: "우선검토" });
  });

  it("동의어 컬럼이 같은 필드로 겹치면 먼저 채워진 값을 쓴다", () => {
    const { mapped } = applyColumnMapping(
      { 회사명: "감마", 기업명: "감마(중복)" },
      STARTUP_IMPORT_MAPPING,
    );
    expect(mapped.name).toBe("감마");
  });
});

describe("classifyAgainst", () => {
  const existing: { id: string; comparable: ComparableMaster }[] = [
    { id: "st-1", comparable: { normalizedName: "알파테크", businessNumber: "1234567890", representativeName: "홍길동" } },
    { id: "st-2", comparable: { normalizedName: "베타", phone: "01099998888" } },
  ];

  it("강한 식별자(사업자번호) 일치는 connect 로 판정한다", () => {
    const r = classifyAgainst(
      { normalizedName: "알파", businessNumber: "1234567890" },
      existing,
    );
    expect(r.kind).toBe("connect");
    expect(r.targetId).toBe("st-1");
    expect(r.score).toBeGreaterThanOrEqual(95);
  });

  it("공식 번호 없이 이름+대표자+연락처가 겹치면 candidate 로 판정한다", () => {
    const r = classifyAgainst(
      { normalizedName: "알파테크", representativeName: "홍길동", phone: "01012345678" },
      existing,
    );
    expect(r.kind).toBe("candidate");
    expect(r.targetId).toBe("st-1");
    expect(r.score).toBeGreaterThanOrEqual(60);
  });

  it("일치 후보가 없으면 new_master 로 판정한다", () => {
    const r = classifyAgainst({ normalizedName: "델타로보틱스" }, existing);
    expect(r.kind).toBe("new_master");
    expect(r.targetId).toBeNull();
  });

  it("사업자번호가 충돌하면 자동 병합 금지 → new_master(별도 마스터)", () => {
    const r = classifyAgainst(
      { normalizedName: "알파테크", businessNumber: "9998887770" },
      existing,
    );
    expect(r.kind).toBe("new_master");
    expect(r.conflict).toBe(true);
  });
});
