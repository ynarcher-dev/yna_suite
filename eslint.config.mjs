import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

/**
 * Y&A Suite 공통 ESLint (flat config).
 *
 * 의존성 방향 규칙을 lint 로 강제한다.
 * (근거: yna_suite_foldering.md §7, 0_CLAUDE.md §4 패키지 의존성, 2_rules.md)
 *   - 앱 간 직접 import 금지 (apps/* -> apps/* 금지). 공유 코드는 packages/* 로.
 *   - packages/ui 는 순수 표현 컴포넌트/토큰만. 비즈니스 로직·API·DB import 금지.
 *
 * 앱/패키지는 별도 eslint.config 를 두지 않고, eslint 가 상위 디렉터리에서
 * 이 루트 config 를 찾아 적용한다. (files 패턴은 이 파일 위치를 기준으로 매칭)
 */

/** 배포 단위 앱 패키지 이름. 어디서도 직접 import 하면 안 된다. */
const APP_PACKAGES = ["hub", "dev", "work", "mna", "project", "fund", "management"].map(
  (n) => `@yna/${n}`,
);

/** packages/ui 가 import 하면 안 되는 비즈니스/데이터/API 계층. */
const UI_FORBIDDEN = [
  "@yna/auth",
  "@yna/database",
  "@yna/master-data",
  "@yna/permissions",
  "@yna/config",
  "@supabase/*",
  "@tanstack/*",
];

/** 패키지 이름 목록을 "이름" + "이름/*" 서브패스까지 포함하는 group 패턴으로 확장. */
function withSubpaths(names) {
  return names.flatMap((n) => (n.endsWith("/*") ? [n] : [n, `${n}/*`]));
}

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/next-env.d.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: withSubpaths(APP_PACKAGES),
              message: "앱 간 직접 import 금지. 공유 코드는 packages/* 로 올린다. (foldering §7)",
            },
          ],
        },
      ],
    },
  },
  {
    // packages/ui 전용: 비즈니스/데이터/API 계층 import 차단.
    files: ["packages/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: withSubpaths([...APP_PACKAGES, ...UI_FORBIDDEN]),
              message:
                "packages/ui 는 순수 표현 컴포넌트/토큰만. 비즈니스 로직·API·DB import 금지. (foldering §7)",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["**/*.tsx"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
);
