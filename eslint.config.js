// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // `src/types` espeja los enums del backend como `const X` + `type X`. No es
    // una redeclaracion: en TypeScript el valor y el tipo viven en espacios de
    // nombres distintos, y asi `Resource` se usa igual que en Python.
    files: ["src/types/**/*.ts"],
    rules: {
      "@typescript-eslint/no-redeclare": "off",
    },
  },
]);
