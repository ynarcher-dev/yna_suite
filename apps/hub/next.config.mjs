/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // lint 는 루트 flat config + turbo lint 로 중앙 관리한다(빌드 시 재검사 생략).
  eslint: { ignoreDuringBuilds: true },
  // 내부 패키지는 TS 소스를 그대로 export 하므로 Next 가 트랜스파일한다.
  // (근거: yna_suite_foldering.md §4·§7 — apps/* 가 packages/* 를 workspace 로 번들)
  transpilePackages: [
    "@yna/auth",
    "@yna/config",
    "@yna/core",
    "@yna/database",
    "@yna/master-data",
    "@yna/permissions",
    "@yna/ui",
    "@yna/utils",
  ],
};

export default nextConfig;
