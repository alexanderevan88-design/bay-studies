import type { Config } from "tailwindcss";

/**
 * "Fog & Bridge" theme.
 * The legacy `sage` and `stone` scales are remapped so older pages pick up
 * the new look: sage-600/700/800 = bridge orange (links / buttons / hover),
 * sage-900 = ink, sage-50..300 = fog tints and lines; stone = cool greys
 * tuned for AA on white and on the fog background.
 */
const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#F4F1EA",
        fog: "#F4F1EA",
        line: "#E6DFD2",
        ink: "#1E2A30",
        muted: "#5E6B70",
        bridge: {
          DEFAULT: "#C8401A",
          link: "#B8370F",
          dark: "#A5330F",
          tint: "#FBE6DC",
        },
        cash: { DEFAULT: "#17643F", tint: "#DDF2E3" },
        poppy: { DEFAULT: "#F2A93B", tint: "#FDF0D8", ink: "#8A5A0B", deep: "#3B2604" },
        bay: { DEFAULT: "#2D6A87", tint: "#E2EEF4" },
        sage: {
          50: "#FBF8F3",
          100: "#E6DFD2",
          200: "#DDD3C2",
          300: "#CBBFAA",
          400: "#B0A28A",
          500: "#D45A33",
          600: "#B8370F",
          700: "#C8401A",
          800: "#A5330F",
          900: "#1E2A30",
          950: "#121A1E",
        },
        stone: {
          50: "#FAF8F4",
          100: "#EFECE5",
          200: "#E6DFD2",
          300: "#D3CABB",
          400: "#626E74",
          500: "#5E6B70",
          600: "#4C575B",
          700: "#3A464C",
          800: "#2A363C",
          900: "#1E2A30",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-display)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 4px 24px -4px rgba(30, 42, 48, 0.08)",
        card: "0 1px 0 rgba(30,42,48,.04), 0 6px 18px -10px rgba(30,42,48,.18)",
      },
    },
  },
  plugins: [],
};
export default config;
