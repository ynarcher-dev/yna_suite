/**
 * 타이포그래피 토큰. (근거: yna_suite_design_system.md §6)
 *
 * 한글 업무 시스템 가독성 우선. hero-scale 금지, letter-spacing 기본 0.
 * 실제 Pretendard 웹폰트는 각 앱 globals.css 에서 로드한다(패키지 의존성 아님).
 */

export const fontFamily = {
  sans: [
    "Pretendard",
    "system-ui",
    "-apple-system",
    "BlinkMacSystemFont",
    "Segoe UI",
    "sans-serif",
  ],
  mono: ["SFMono-Regular", "Consolas", "Liberation Mono", "monospace"],
} as const;

/** [size, lineHeight]. tailwind fontSize 형식. */
export const fontSize = {
  xs: ["12px", "16px"], // 배지, 보조 설명
  sm: ["13px", "18px"], // 테이블, 조밀한 폼
  base: ["14px", "20px"], // 기본 본문, 입력값
  md: ["15px", "22px"], // 섹션 설명
  lg: ["18px", "26px"], // 페이지 소제목
  xl: ["22px", "30px"], // 페이지 제목
  "2xl": ["28px", "36px"], // 대시보드 상위 제목
} as const;
