import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      // Existing client data-loading effects are intentional. They will be
      // refactored incrementally without blocking security releases.
      "react-hooks/set-state-in-effect": "off",
      // Spanish legal/support copy contains apostrophes that are safe in JSX.
      "react/no-unescaped-entities": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "dist/**",
    "next-env.d.ts",
    "public/sw.js",
  ]),
]);
