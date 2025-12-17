import type { Config } from "tailwindcss";

// Tailwind v4 uses CSS-first configuration via @theme in globals.css
// This config file is minimal - mainly for content paths
const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
};

export default config;
