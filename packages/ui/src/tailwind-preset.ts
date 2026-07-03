import type { Config } from "tailwindcss";

/**
 * 앱 공통 Tailwind preset.
 * (근거: yna_suite_design_system.md — 그레이스케일 중심 + CI Red 제한 사용)
 *
 * Phase 1.1 은 최소 preset 만 둔다. 팔레트/타이포/spacing/radius/shadow 토큰은
 * Phase 1.2(디자인 토큰 정의)에서 packages/ui/tokens 로 확장한다.
 */
export const ynaPreset = {
  theme: {
    extend: {
      colors: {
        // CI Red — 강조/위험 액션에 제한적으로만 사용.
        brand: {
          DEFAULT: "#E22213",
        },
      },
    },
  },
} satisfies Partial<Config>;
