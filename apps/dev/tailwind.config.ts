import type { Config } from "tailwindcss";
import { ynaPreset } from "@yna/ui/tailwind-preset";

const config: Config = {
  presets: [ynaPreset as Partial<Config>],
  content: ["./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
};

export default config;
