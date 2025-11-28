import vue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'
import globals from 'globals'

export default [
  {
    files: ['renderer/src/**/*.{js,vue}'],

    languageOptions: {
      parser: vueParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },

    plugins: {
      vue,
    },

    rules: {
      ...vue.configs['flat/essential'].rules,

      // custom rules
      'no-unused-vars': 'warn',
      'no-undef': 'warn',
    },
  },

  // ignore
  {
    ignores: ['dist/**', 'out/**', '.vite/**', 'node_modules/**'],
  },
]
