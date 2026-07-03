/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // lint 는 루트 flat config + turbo lint 로 중앙 관리한다(빌드 시 재검사 생략).
  eslint: { ignoreDuringBuilds: true },
  transpilePackages: [
    "@yna/auth",
    "@yna/config",
    "@yna/core",
    "@yna/database",
    "@yna/permissions",
    "@yna/ui",
    "@yna/utils",
  ],
};

export default nextConfig;
