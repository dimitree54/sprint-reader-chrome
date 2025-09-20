const { FlatCompat } = require('@eslint/eslintrc')
const js = require('@eslint/js')
const sonarjs = require('eslint-plugin-sonarjs')

const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
})

module.exports = [
  {
    ignores: [
      'dist/',
      'SafariBuild/',
      'Sprint Reader/',
      'tmp/',
      'tmp-test-profile/',
      'web-ext-profile/',
      'node_modules/'
    ]
  },
  {
    plugins: {
      sonarjs: sonarjs
    },
    rules: {
      'sonarjs/no-duplicate-string': ['error', { threshold: 3 }],
      'sonarjs/no-identical-functions': 'error',
      'sonarjs/cognitive-complexity': ['error', 15],
      'sonarjs/no-duplicated-branches': 'error'
    }
  },
  ...compat.config({
    root: true,
    extends: [
      'eslint:recommended',
      'plugin:import/recommended',
      'plugin:import/typescript',
      'plugin:n/recommended',
      'plugin:promise/recommended'
    ],
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
    settings: {
      'import/extensions': ['.js', '.ts'],
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true
        },
        node: {
          extensions: ['.js', '.ts', '.d.ts']
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
          'no-unused-vars': 'off',
          '@typescript-eslint/no-unused-vars': ['error', {
            vars: 'all',
            args: 'after-used',
            ignoreRestSiblings: false
          }],
          '@typescript-eslint/no-explicit-any': 'off'
        }
      },
      {
        files: ['*.config.{js,ts}', 'scripts/**/*.{js,ts}'],
        env: {
          node: true
        }
      }
    ],
    rules: {
      'max-lines': ['error', { max: 200, skipBlankLines: true, skipComments: true }],
      'no-unused-vars': ['error', {
        vars: 'all',
        args: 'after-used',
        ignoreRestSiblings: false
      }],
      'no-unreachable': 'error',
      'no-unused-expressions': 'error',
      'n/no-missing-import': ['error', {
        tryExtensions: ['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.d.ts', '.json']
      }],
      'n/no-extraneous-require': ['error', {
        allowModules: ['@eslint/eslintrc', '@eslint/js']
      }],
      'n/no-unpublished-require': ['error', {
        allowModules: ['@eslint/eslintrc', '@eslint/js', 'eslint-plugin-sonarjs']
      }],
      'n/no-unpublished-import': ['error', {
        allowModules: ['@playwright/test', 'esbuild']
      }]
    }
  })
]
