module.exports = {
	env: {
		browser: true,
		es2021: true,
		webextensions: true,
	},
	extends: "eslint:recommended",
	overrides: [],
	parserOptions: {
		ecmaVersion: "latest",
	},
	rules: {
		indent: ["error", "tab"],
		semi: ["error", "never"],
	},
	parserOptions: {
		sourceType: "module",
	},
}
