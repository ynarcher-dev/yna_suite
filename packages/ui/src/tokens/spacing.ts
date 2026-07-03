/**
 * Spacing / density 토큰. (근거: yna_suite_design_system.md §7)
 *
 * 4px grid. 이 값들은 tailwind 기본 spacing scale(1=4px…10=40px)과 동일하므로
 * preset 에서 별도 재정의하지 않고, 문서/컴포넌트 참조용 상수로만 둔다.
 */
export const space = {
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
} as const;

/** 업무 화면 표준 규격(px). 컴포넌트 높이/폭 기준. */
export const size = {
  inputHeight: 36,
  buttonSm: 32,
  buttonMd: 36,
  buttonLg: 40,
  tableHeader: 36,
  tableRowCompact: 40,
  tableRowComfortable: 44,
  toolbarHeight: 48,
  topbarHeight: 56,
  sidebarWidth: 240,
  sidebarCollapsed: 64,
} as const;
