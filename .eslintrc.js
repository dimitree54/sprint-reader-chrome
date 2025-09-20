module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:promise/recommended'
  ],
  env: {
    browser: true,
    es6: true
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  globals: {
    chrome: 'readonly',
    browser: 'readonly'
  },
  settings: {
    'import/extensions': ['.js', '.ts'],
    'import/resolver': {
      node: {
        extensions: ['.js', '.ts']
      }
    }
  },
  overrides: [
    {
      files: ['**/*.ts'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      extends: [
        'plugin:@typescript-eslint/recommended'
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
        }],
        '@typescript-eslint/no-explicit-any': 'off',
        'n/no-missing-import': 'off'
      }
    },
    {
      files: ['*.config.{js,ts}', 'scripts/**/*.{js,ts}'],
      env: {
        node: true
      },
      extends: ['plugin:n/recommended']
    }
  ],
  rules: {
    // Enforce maximum file length of 300 lines
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
