import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Y&A Dev",
  description: "계정 생성 · 권한 템플릿 · 서비스별 접근 제어",
};

/**
 * 루트 레이아웃. AppShell 은 인증된 (app) 라우트 그룹에서만 감싼다.
 * (login/auth 콜백은 shell 없이 렌더)
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
