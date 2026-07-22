import js from "@eslint/js";
import react from "eslint-plugin-react";
import globals from "globals";

// ESLint 9 flat config. `npm run lint` targets src (browser + React).
export default [
  js.configs.recommended,
  {
    files: ["src/**/*.{js,jsx}"],
    ...react.configs.flat.recommended,
    languageOptions: {
      ...react.configs.flat.recommended.languageOptions,
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
      },
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...react.configs.flat.recommended.rules,
      // Vite/React 18 automatic JSX runtime — no React import needed in scope.
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      // Don't flag intentionally-ignored catch bindings (`catch (e) {}`).
      "no-unused-vars": ["error", { caughtErrors: "none" }],
    },
  },
];
