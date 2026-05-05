/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17201b",
        civic: {
          50: "#f4f8f6",
          100: "#e2eee8",
          500: "#28715a",
          700: "#174b3c",
          900: "#0e2d25",
        },
        signal: "#d99122",
      },
      boxShadow: {
        soft: "0 18px 50px rgba(23, 32, 27, 0.08)",
      },
    },
  },
  plugins: [],
};
