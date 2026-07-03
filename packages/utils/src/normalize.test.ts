import { describe, expect, it } from "vitest";
import {
  normalizeBusinessNumber,
  normalizeCompanyName,
  normalizeEmail,
  normalizeWebsiteDomain,
} from "./normalize";

describe("normalizeCompanyName", () => {
  it("법인격 표기와 공백/특수문자를 흡수해 같은 키를 만든다", () => {
    expect(normalizeCompanyName("(주) 와이앤아처")).toBe("와이앤아처");
    expect(normalizeCompanyName("주식회사 와이앤아처")).toBe("와이앤아처");
    expect(normalizeCompanyName("와이앤아처㈜")).toBe("와이앤아처");
  });
});

describe("normalizeBusinessNumber", () => {
  it("숫자만 남긴다", () => {
    expect(normalizeBusinessNumber("123-45-67890")).toBe("1234567890");
  });
});

describe("normalizeEmail", () => {
  it("trim + 소문자화", () => {
    expect(normalizeEmail("  Dev@YNArcher.com ")).toBe("dev@ynarcher.com");
  });
});

describe("normalizeWebsiteDomain", () => {
  it("scheme/www/path 제거", () => {
    expect(normalizeWebsiteDomain("https://www.ynarcher.co.kr/about")).toBe("ynarcher.co.kr");
  });
});
