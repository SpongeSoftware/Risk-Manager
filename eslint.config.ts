import { defineConfig } from "eslint/config"
import reactPlugin from "eslint-plugin-react"
import reactCompilerPlugin from "eslint-plugin-react-compiler"
import reactHooksPlugin from "eslint-plugin-react-hooks"
import tseslint from "typescript-eslint"

export default defineConfig(
	{
		ignores: ["build/**", "node_modules/**", ".react-router/**", "drizzle/**", ".storybook/**"],
	},
	...tseslint.configs.strictTypeChecked,
	...tseslint.configs.stylisticTypeChecked,
	{
		plugins: {
			react: reactPlugin,
			"react-hooks": reactHooksPlugin,
			"react-compiler": reactCompilerPlugin,
		},
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
			},
		},
		settings: {
			react: { version: "19" },
		},
		rules: {
			...reactPlugin.configs.recommended.rules,
			...reactPlugin.configs["jsx-runtime"].rules,
			...reactHooksPlugin.configs.recommended.rules,
			"react-compiler/react-compiler": "error",

			quotes: ["error", "double"],
			semi: ["error", "never"],
			"no-tabs": "off",
			indent: ["error", "tab", { SwitchCase: 1 }],

			// React Router uses throw data() / throw redirect() as control flow — not standard Error objects
			"@typescript-eslint/only-throw-error": "off",
			// Allow numbers in template literals (e.g. `/teams/${teamId}`)
			"@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
			// Allow async functions in JSX event attributes and object callbacks (e.g. confirmDialog accept)
			"@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: { attributes: false, properties: false } }],
			// Treat _-prefixed parameters/variables as intentionally unused
			"@typescript-eslint/no-unused-vars": ["error", {
				argsIgnorePattern: "^_",
				varsIgnorePattern: "^_",
				destructuredArrayIgnorePattern: "^_",
				caughtErrors: "all",
				ignoreRestSiblings: true,
			}],
		},
	},
)
