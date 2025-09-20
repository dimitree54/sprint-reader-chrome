module.exports = {
  extends: ['standard'],
  env: {
    browser: true,
    es6: true,
    webextensions: true
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'script'
  },
  globals: {
    chrome: 'readonly',
    browser: 'readonly'
  },
  rules: {
    // Enforce maximum file length of 200 lines
    'max-lines': ['error', { max: 200, skipBlankLines: true, skipComments: true }],

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