import { describe, expect, it } from "vitest";
import { candidateStrength, isCandidate } from "./score";

describe("candidateStrength", () => {
  it("임계값 경계에서 등급을 정확히 나눈다", () => {
    expect(candidateStrength(95)).toBe("strong");
    expect(candidateStrength(94)).toBe("medium");
    expect(candidateStrength(80)).toBe("medium");
    expect(candidateStrength(79)).toBe("weak");
    expect(candidateStrength(60)).toBe("weak");
    expect(candidateStrength(59)).toBe("none");
  });

  it("60 미만은 후보로 유지하지 않는다", () => {
    expect(isCandidate(60)).toBe(true);
    expect(isCandidate(59)).toBe(false);
  });
});
