const { fontFamily } = require("tailwindcss/defaultTheme");

module.exports = {
  mode: "jit",
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter var", ...fontFamily.sans],
      },
      borderRadius: {
        DEFAULT: "8px",
        secondary: "4px",
        container: "12px",
      },
      boxShadow: {
        DEFAULT: "0 1px 4px rgba(0, 0, 0, 0.1)",
        hover: "0 2px 8px rgba(0, 0, 0, 0.12)",
      },
      colors: {
        // Brand palette derived from logo
        brand: {
          black: "#0B0B0C",
          cream: "#E9DCC8",
          gold: "#F2C443",
          red: "#D4493A",
          gray: "#6F767D",
          grayDark: "#3D4349",
          grayLight: "#B9C1C7",
          white: "#FFFFFF",
        },
        // Keep backwards-compatible semantic tokens mapped to brand palette
        primary: {
          DEFAULT: "#0B0B0C", // brand.black
          hover: "#3D4349", // brand.grayDark
        },
        secondary: {
          DEFAULT: "#E9DCC8", // brand.cream
          hover: "#E2D3B9", // slight darker cream
        },
        accent: {
          DEFAULT: "#F2C443", // brand.gold
          hover: "#DDB53B", // slightly darker gold
        },
      },
      spacing: {
        "form-field": "16px",
        section: "32px",
      },
    },
  },
  variants: {
    extend: {
      boxShadow: ["hover", "active"],
    },
  },
};
