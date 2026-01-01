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
        },
        ink: {
          primary: "#2C2416",
          secondary: "#5C4A3A",
        },
        accent: {
          blue: "#4A6FA5",
          red: "#A54A4A",
        },
      },
      boxShadow: {
        paper: "0 2px 8px rgba(44, 36, 22, 0.08)",
        elevated: "0 4px 16px rgba(44, 36, 22, 0.12)",
      },
    },
  },
  plugins: [],
}
