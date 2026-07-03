import type { Config } from "tailwindcss";
import { red, gray, semantic } from "./tokens/colors";
import { fontFamily, fontSize } from "./tokens/typography";
import { radius } from "./tokens/radius";
import { shadow } from "./tokens/shadows";

/**
 * 앱 공통 Tailwind preset.
 * (근거: yna_suite_design_system.md — 그레이스케일 중심 + CI Red 제한 사용)
 *
 * packages/ui/tokens 의 디자인 토큰을 tailwind theme 로 노출한다.
 * 앱과 packages/ui 컴포넌트는 여기서 나온 클래스(bg-brand, text-gray-700 등)만 사용한다.
 * (spacing 은 tailwind 기본 4px grid 와 동일하여 재정의하지 않음)
 */
export const ynaPreset = {
  theme: {
    extend: {
      colors: {
        // CI Red — 강조/위험 액션에 제한적으로만 사용. brand.DEFAULT = red.500.
        brand: { ...red, DEFAULT: red[500] },
        red,
        gray,
        success: {
          DEFAULT: semantic.success.DEFAULT,
          subtle: semantic.success.subtle,
          border: semantic.success.border,
        },
        warning: {
          DEFAULT: semantic.warning.DEFAULT,
          subtle: semantic.warning.subtle,
          border: semantic.warning.border,
        },
        info: {
          DEFAULT: semantic.info.DEFAULT,
          subtle: semantic.info.subtle,
          border: semantic.info.border,
        },
      },
      fontFamily: {
        sans: [...fontFamily.sans],
        mono: [...fontFamily.mono],
      },
      fontSize: fontSize as unknown as Record<string, [string, string]>,
      borderRadius: radius,
      boxShadow: shadow,
    },
  },
} satisfies Partial<Config>;
