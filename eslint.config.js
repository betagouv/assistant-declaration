const next = require('eslint-config-next');
const prettier = require('eslint-config-prettier');
const mdx = require('eslint-plugin-mdx');
const storybook = require('eslint-plugin-storybook');
const testingLibrary = require('eslint-plugin-testing-library');

module.exports = [
  {
    ignores: ['build/**', 'data/**', 'dist/**', 'storybook-static/**'],
  },
  ...next,
  ...storybook.configs['flat/recommended'],
  {
    rules: {
      ...prettier.rules,
      '@next/next/no-html-link-for-pages': 'off',
      'interface-name': 'off',
      'no-console': 'off',
      'no-implicit-dependencies': 'off',
      'no-submodule-imports': 'off',
      'no-trailing-spaces': 'error',
      'react/jsx-key': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/incompatible-library': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/use-memo': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'storybook/no-uninstalled-addons': 'off',
    },
  },
  mdx.configs.flat,
  {
    files: ['**/*.md', '**/*.mdx'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 12,
      },
    },
    rules: {
      'jsx-a11y/heading-has-content': 'off',
    },
  },
  {
    files: ['src/client/helloasso/*.ts', 'src/client/mapado/*.ts', 'src/client/supersoniks/*.ts'],
    rules: {
      'no-prototype-builtins': 'off',
      'no-undef': 'off',
    },
  },
  {
    files: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
    ...testingLibrary.configs['flat/react'],
  },
];
