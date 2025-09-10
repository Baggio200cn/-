import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        localStorage: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        document: 'readonly',
        window: 'readonly',
        HTMLElement: 'readonly',
        Event: 'readonly',
        CustomEvent: 'readonly',
        DOMContentLoaded: 'readonly'
      }
    },
    rules: {
      'indent': ['error', 2],
      'quotes': ['error', 'single'],
      'semi': ['error', 'always'],
      'no-unused-vars': ['warn'],
      'no-console': ['off'],
      'prefer-const': ['error'],
      'no-var': ['error'],
      'eqeqeq': ['error'],
      'curly': ['error'],
      'brace-style': ['error', '1tbs'],
      'comma-spacing': ['error', { 'before': false, 'after': true }],
      'key-spacing': ['error', { 'beforeColon': false, 'afterColon': true }],
      'space-before-blocks': ['error'],
      'space-infix-ops': ['error'],
      'no-trailing-spaces': ['error'],
      'eol-last': ['error'],
      'no-multiple-empty-lines': ['error', { 'max': 2 }]
    }
  }
];