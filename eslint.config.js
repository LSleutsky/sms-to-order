import js from "@eslint/js";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import tailwindcss from "eslint-plugin-tailwindcss";
import { defineConfig } from "eslint/config";
import globals from "globals";
import path from "node:path";
import tseslint from "typescript-eslint";

export default defineConfig(
  { ignores: ["**/dist/**", "**/node_modules/**", "data/**"] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["client/**/*.{ts,tsx}"],
    extends: [
      react.configs.flat.recommended,
      react.configs.flat["jsx-runtime"],
      reactHooks.configs.flat.recommended,
      tailwindcss.configs.recommended
    ],
    languageOptions: { globals: globals.browser },
    settings: {
      react: { version: "detect" },
      tailwindcss: { cssConfigPath: path.join(import.meta.dirname, "client/src/index.css") }
    },
    rules: {
      "react/jsx-sort-props": ["error", { callbacksLast: true, shorthandFirst: true, reservedFirst: true }]
    }
  },
  {
    files: ["server/**/*.ts", "*.js", "client/vite.config.ts"],
    languageOptions: { globals: globals.node }
  },
  {
    rules: {
      curly: ["error", "all"]
    }
  },
  prettierRecommended
);
