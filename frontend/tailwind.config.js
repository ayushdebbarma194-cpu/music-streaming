/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      // Material 3 color roles, all driven by CSS variables set at runtime
      // by the Material You scheme generator. rgb() so we can use /<alpha>.
      colors: {
        primary: "rgb(var(--md-primary) / <alpha-value>)",
        "on-primary": "rgb(var(--md-on-primary) / <alpha-value>)",
        "primary-container": "rgb(var(--md-primary-container) / <alpha-value>)",
        "on-primary-container": "rgb(var(--md-on-primary-container) / <alpha-value>)",
        secondary: "rgb(var(--md-secondary) / <alpha-value>)",
        "on-secondary": "rgb(var(--md-on-secondary) / <alpha-value>)",
        "secondary-container": "rgb(var(--md-secondary-container) / <alpha-value>)",
        "on-secondary-container": "rgb(var(--md-on-secondary-container) / <alpha-value>)",
        tertiary: "rgb(var(--md-tertiary) / <alpha-value>)",
        "on-tertiary": "rgb(var(--md-on-tertiary) / <alpha-value>)",
        "tertiary-container": "rgb(var(--md-tertiary-container) / <alpha-value>)",
        "on-tertiary-container": "rgb(var(--md-on-tertiary-container) / <alpha-value>)",
        error: "rgb(var(--md-error) / <alpha-value>)",
        "on-error": "rgb(var(--md-on-error) / <alpha-value>)",
        "error-container": "rgb(var(--md-error-container) / <alpha-value>)",
        "on-error-container": "rgb(var(--md-on-error-container) / <alpha-value>)",
        background: "rgb(var(--md-background) / <alpha-value>)",
        "on-background": "rgb(var(--md-on-background) / <alpha-value>)",
        surface: "rgb(var(--md-surface) / <alpha-value>)",
        "on-surface": "rgb(var(--md-on-surface) / <alpha-value>)",
        "surface-variant": "rgb(var(--md-surface-variant) / <alpha-value>)",
        "on-surface-variant": "rgb(var(--md-on-surface-variant) / <alpha-value>)",
        outline: "rgb(var(--md-outline) / <alpha-value>)",
        "outline-variant": "rgb(var(--md-outline-variant) / <alpha-value>)",
        // Tonal surface containers (M3 elevation by tone, not shadow)
        "surface-container-lowest": "rgb(var(--md-surface-container-lowest) / <alpha-value>)",
        "surface-container-low": "rgb(var(--md-surface-container-low) / <alpha-value>)",
        "surface-container": "rgb(var(--md-surface-container) / <alpha-value>)",
        "surface-container-high": "rgb(var(--md-surface-container-high) / <alpha-value>)",
        "surface-container-highest": "rgb(var(--md-surface-container-highest) / <alpha-value>)",
        "inverse-surface": "rgb(var(--md-inverse-surface) / <alpha-value>)",
        "inverse-on-surface": "rgb(var(--md-inverse-on-surface) / <alpha-value>)",
      },
      borderRadius: {
        // Material 3 shape scale
        "m3-xs": "4px",
        "m3-sm": "8px",
        "m3-md": "12px",
        "m3-lg": "16px",
        "m3-xl": "28px",
      },
      fontFamily: {
        sans: [
          "Inter",
          "Cantarell",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      fontSize: {
        // Material 3 type scale (size / line-height / weight / tracking)
        "display-lg": ["57px", { lineHeight: "64px", letterSpacing: "-0.25px" }],
        "display-md": ["45px", { lineHeight: "52px" }],
        "display-sm": ["36px", { lineHeight: "44px" }],
        "headline-lg": ["32px", { lineHeight: "40px" }],
        "headline-md": ["28px", { lineHeight: "36px" }],
        "headline-sm": ["24px", { lineHeight: "32px" }],
        "title-lg": ["22px", { lineHeight: "28px" }],
        "title-md": ["16px", { lineHeight: "24px", letterSpacing: "0.15px", fontWeight: "500" }],
        "title-sm": ["14px", { lineHeight: "20px", letterSpacing: "0.1px", fontWeight: "500" }],
        "body-lg": ["16px", { lineHeight: "24px", letterSpacing: "0.5px" }],
        "body-md": ["14px", { lineHeight: "20px", letterSpacing: "0.25px" }],
        "body-sm": ["12px", { lineHeight: "16px", letterSpacing: "0.4px" }],
        "label-lg": ["14px", { lineHeight: "20px", letterSpacing: "0.1px", fontWeight: "500" }],
        "label-md": ["12px", { lineHeight: "16px", letterSpacing: "0.5px", fontWeight: "500" }],
        "label-sm": ["11px", { lineHeight: "16px", letterSpacing: "0.5px", fontWeight: "500" }],
      },
      transitionTimingFunction: {
        // M3 emphasized easing
        "m3-standard": "cubic-bezier(0.2, 0, 0, 1)",
        "m3-emphasized": "cubic-bezier(0.05, 0.7, 0.1, 1)",
      },
    },
  },
  plugins: [],
};
