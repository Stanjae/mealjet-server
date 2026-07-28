import tseslintPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tseslintPlugin,
    },
    rules: {},
  },
  {
    files: ["src/modules/**/**/*.ts", "src/shared/**/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@modules/orders/orders.model",
                "@modules/orders/orders.types",
                "@modules/orders/orders.services",
              ],
              message:
                "Use the orders module public API via @modules/orders instead of importing orders internals.",
            },
            {
              group: [
                "@modules/users/user.model",
                "@modules/users/user.types",
                "@modules/users/user.services",
              ],
              message:
                "Use the user module public API via @modules/users instead of importing user internals.",
            },
            {
              group: [
                "@modules/vendor/vendor.model",
                "@modules/vendor/vendor.types",
                "@modules/vendor/vendor.services",
              ],
              message:
                "Use the vendor module public API via @modules/vendor instead of importing vendor internals.",
            },
            {
              group: [
                "@modules/rider/rider.model",
                "@modules/rider/rider.types",
                "@modules/rider/rider.services",
              ],
              message:
                "Use the rider module public API via @modules/rider instead of importing rider internals.",
            },
            {
              group: [
                "@modules/transaction/transaction.model",
                "@modules/transaction/transaction.service",
                "@modules/transaction/transaction.types",
              ],
              message:
                "Use the transaction module public API via @modules/transaction instead of importing transaction internals.",
            },
            {
              group: [
                "@modules/menus/menu.model",
                "@modules/menus/menu.service",
                "@modules/menus/menu.types",
              ],
              message:
                "Use the menus module public API via @modules/menus instead of importing menus internals.",
            },
            {
              group: [
                "@modules/menu-category/menuCategory.model",
                "@modules/menu-category/menuCategory.service",
                "@modules/menu-category/menuCategory.types",
              ],
              message:
                "Use the menu-category module public API via @modules/menu-category instead of importing menu-category internals.",
            },
          ],
        },
      ],
    },
  },
];
