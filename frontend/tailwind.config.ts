import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        tl: {
          navy: "var(--tl-navy)",
          "navy-light": "var(--tl-navy-light)",
          accent: "var(--tl-accent)",
          "accent-hover": "var(--tl-accent-hover)",
          success: "var(--tl-success)",
          warning: "var(--tl-warning)",
          danger: "var(--tl-danger)",
          bg: "var(--tl-bg)",
          surface: "var(--tl-surface)",
        }
      },
    },
  },
  plugins: [],
};
export default config;
