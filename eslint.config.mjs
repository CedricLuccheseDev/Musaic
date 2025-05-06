// @ts-check
import prettierConfig from "eslint-config-prettier";
import prettier from "eslint-plugin-prettier";
import withNuxt from "./.nuxt/eslint.config.mjs";

export default withNuxt([
  {
    plugins: {
      prettier: prettier,
    },
    rules: {
      "prettier/prettier": [
        "error",
        {
          plugins: ["prettier-plugin-tailwindcss"],
        },
      ],
      "vue/multi-word-component-names": "off",
    },
  },
  prettierConfig,
]);
