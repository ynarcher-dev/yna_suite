/**
 * Radius 토큰. (근거: yna_suite_design_system.md §8)
 * 카드 radius 최대 8px. 업무형 UI 는 과한 둥근 모서리를 피한다.
 */
export const radius = {
  sm: "4px", // input, badge
  md: "6px", // button, select, small panel
  lg: "8px", // dialog, repeated card
} as const;
