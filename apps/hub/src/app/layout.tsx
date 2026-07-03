import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Providers } from "./providers";
import { AppFrame } from "@/components/app-frame";
import "./globals.css";

export const metadata: Metadata = {
  title: "Y&A Hub",
  description: "전사 마스터 원장 · 통합 검색 · 병합 승인",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Providers>
          <AppFrame>{children}</AppFrame>
        </Providers>
      </body>
    </html>
  );
}
