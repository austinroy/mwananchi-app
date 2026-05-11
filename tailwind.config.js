/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#102018",
        civic: {
          50: "#eaf8ef",
          100: "#cfe9d8",
          500: "#4b8f62",
          700: "#1f6a43",
          900: "#0b3a28",
        },
        signal: "#c99a42",
      },
      boxShadow: {
        soft: "0 24px 70px rgba(7, 58, 40, 0.13)",
      },
    },
  },
  plugins: [],
};
