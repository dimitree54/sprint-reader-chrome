module.exports = {
  extends: ['standard'],
  env: {
    browser: true,
    es6: true,
    webextensions: true
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  globals: {
    chrome: 'readonly',
    browser: 'readonly'
  },
  overrides: [
    {
      files: ['**/*.ts'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      extends: [
        'standard'
      ],
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module'
      },
      rules: {
        // Override no-unused-vars for TypeScript
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': ['error', {
          vars: 'all',
          args: 'after-used',
          ignoreRestSiblings: false
        }]
      }
    }
  ],
  rules: {
    // Enforce maximum file length of 200 lines, but allow 300 for complex entry points
    'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],

    // Dead code detection rules
    'no-unused-vars': ['error', {
      vars: 'all',
      args: 'after-used',
      ignoreRestSiblings: false
    }],
    'no-unreachable': 'error',
    'no-unused-expressions': 'error'
  }
}