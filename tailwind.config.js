/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: {
          bg: "#F5F1E8",
          dark: "#E8E0D0",
          light: "#FAF8F3",
        },
        ink: {
          primary: "#2C2416",
          secondary: "#5C4A3A",
          muted: "#8B7668",
        },
        accent: {
          blue: "#4A6FA5",
          "blue-light": "#8BB4D8",
          "blue-hover": "#3D5D8C",
          red: "#A54A4A",
          "red-light": "#E57373",
        },
        // Status colors
        success: "#5B9B5B",
        warning: "#D9774A",
        info: "#5B8BA5",
      },
      boxShadow: {
        paper: "0 2px 8px rgba(44, 36, 22, 0.08)",
        elevated: "0 4px 16px rgba(44, 36, 22, 0.12)",
        "glow-blue": "0 0 20px rgba(74, 111, 165, 0.15)",
        "glow-amber": "0 0 20px rgba(245, 158, 11, 0.15)",
      },
      transitionTimingFunction: {
        "bounce-subtle": "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [],
}
