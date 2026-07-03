import { describe, expect, it } from "vitest";
import { maskBusinessNumber, maskEmail, maskName, maskPhone } from "./format";

describe("maskEmail", () => {
  it("아이디 뒤쪽을 가린다", () => {
    expect(maskEmail("hong@example.com")).toBe("h***@example.com");
  });
  it("잘못된 형식은 ***", () => {
    expect(maskEmail("@nope")).toBe("***");
  });
});

describe("maskPhone", () => {
  it("뒤 4자리만 노출한다", () => {
    expect(maskPhone("010-1234-5678")).toBe("***-****-5678");
  });
});

describe("maskBusinessNumber", () => {
  it("앞 3자리만 노출한다", () => {
    expect(maskBusinessNumber("123-45-67890")).toBe("123-**-*****");
  });
  it("짧으면 ***", () => {
    expect(maskBusinessNumber("12")).toBe("***");
  });
});

describe("maskName", () => {
  it("가운데를 가린다", () => {
    expect(maskName("홍길동")).toBe("홍*동");
    expect(maskName("남궁민수")).toBe("남**수");
  });
  it("두 글자는 뒤를 가린다", () => {
    expect(maskName("홍길")).toBe("홍*");
  });
  it("한 글자는 그대로", () => {
    expect(maskName("홍")).toBe("홍");
  });
});
