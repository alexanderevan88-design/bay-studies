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
        cream: "#F7F6F2",
        sage: {
          50: "#F3F5F0",
          100: "#E4E9DE",
          200: "#C9D4BF",
          300: "#A8B996",
          400: "#879E74",
          500: "#6B845A",
          600: "#5F6F52",
          700: "#4F5C44",
          800: "#404A38",
          900: "#343C2E",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      boxShadow: {
        soft: "0 4px 24px -4px rgba(63, 74, 52, 0.08)",
      },
    },
  },
  plugins: [],
};
export default config;
