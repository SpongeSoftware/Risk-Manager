import reactPlugin from "eslint-plugin-react"
import reactCompilerPlugin from "eslint-plugin-react-compiler"
import reactHooksPlugin from "eslint-plugin-react-hooks"
import tseslint from "typescript-eslint"

export default tseslint.config(
	{
		ignores: ["build/**", "node_modules/**", ".react-router/**", "drizzle/**"],
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
			react: { version: "detect" },
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
		},
	},
)
