/**
 * Shadow 토큰. (근거: yna_suite_design_system.md §8)
 * shadow 는 dropdown/popover/dialog 에만 제한적으로 사용한다.
 * 기본 구분은 shadow 보다 border 를 우선한다.
 */
export const shadow = {
  dropdown: "0 4px 12px rgba(0, 0, 0, 0.08)",
  popover: "0 4px 12px rgba(0, 0, 0, 0.08)",
  dialog: "0 8px 24px rgba(0, 0, 0, 0.12)",
} as const;
