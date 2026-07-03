/**
 * 컬러 토큰. (근거: yna_suite_design_system.md §3~4)
 *
 * 그레이스케일 중심 + CI Red 제한 사용. semantic 색상은 업무 상태 신호용이며
 * "색상만으로 상태를 구분하지 않는다"는 규칙에 따라 항상 텍스트 라벨과 함께 쓴다.
 * 여기 값이 tailwind preset·컴포넌트 스타일의 단일 기준이다.
 */

/** CI Red `#E22213` 중심 밝기 단계. */
export const red = {
  25: "#FFF5F4",
  50: "#FDECEA",
  100: "#FAD3CF",
  200: "#F5A9A1",
  300: "#EF7D72",
  400: "#EA5143",
  500: "#E22213",
  600: "#C91E11",
  700: "#B31A0F",
  800: "#9F170D",
  900: "#86130B",
} as const;

/** 대부분 화면의 기본 그레이스케일. */
export const gray = {
  0: "#FFFFFF",
  25: "#FAFAFA",
  50: "#F7F7F7",
  100: "#F0F0F0",
  200: "#E5E5E5",
  300: "#D4D4D4",
  400: "#A3A3A3",
  500: "#737373",
  600: "#515151",
  700: "#3F3F3F",
  800: "#2F2F2F",
  900: "#1F1F1F",
} as const;

/** 업무 상태 신호색. text/subtle(bg)/border 3종. */
export const semantic = {
  success: { DEFAULT: "#166534", subtle: "#F0FDF4", border: "#BBF7D0" },
  warning: { DEFAULT: "#92400E", subtle: "#FFFBEB", border: "#FDE68A" },
  info: { DEFAULT: "#1D4ED8", subtle: "#EFF6FF", border: "#BFDBFE" },
} as const;
