import type { Config } from "tailwindcss";
import { ynaPreset } from "@yna/ui/tailwind-preset";

const config: Config = {
  presets: [ynaPreset as Partial<Config>],
  content: [
    "./src/**/*.{ts,tsx}",
    // 공통 UI 패키지의 클래스도 스캔 대상에 포함.
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
};

export default config;
