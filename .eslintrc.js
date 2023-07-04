module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  ignorePatterns: ['public'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    react: {
      version: '16',
    },
  },
  plugins: [
    'react',
    '@typescript-eslint',
    '@tanstack/query',
  ],
  globals: {
    find: 'off',
  },
  extends: [
    'plugin:react/recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@tanstack/eslint-plugin-query/recommended',
  ],
  rules: {
    'array-bracket-spacing': ['error', 'never'],
    'arrow-parens': 'error',
    'arrow-spacing': 'error',
    'brace-style': 'off', // TypeScript extension
    'comma-dangle': 'off', // TypeScript extension
    'comma-spacing': 'off', // TypeScript extension
    'computed-property-spacing': 'error',
    'eol-last': 'error',
    eqeqeq: 'error',
    'generator-star-spacing': 'error',
    indent: ['error', 2, { SwitchCase: 1, MemberExpression: 0 }],
    'jsx-quotes': ['error', 'prefer-double'],
    'key-spacing': 'error',
    'keyword-spacing': 'off', // TypeScript extension
    'no-cond-assign': 'error',
    // We're making console statements report as warnings, so that it's easier
    // to tell in the editor when there are real errors vs just console
    // statements. But CI checks that there aren't any warnings in addition to
    // errors, so we're still enforcing that no console statements are checked
    // in.
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-delete-var': 'error',
    'no-dupe-args': 'error',
    'no-dupe-else-if': 'error',
    'no-duplicate-case': 'error',
    'no-empty': 'error',
    'no-empty-pattern': 'error',
    'no-eval': 'error',
    'no-ex-assign': 'error',
    'no-extra-semi': 'off', // TypeScript extension
    'no-func-assign': 'error',
    'no-implied-eval': 'error',
    'no-import-assign': 'error',
    'no-invalid-regexp': 'error',
    'no-irregular-whitespace': 'error',
    'no-misleading-character-class': 'error',
    'no-mixed-spaces-and-tabs': 'error',
    'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0 }],
    'no-multi-spaces': ['error', {
      ignoreEOLComments: true,
      exceptions: {
        VariableDeclarator: true,
      },
    }],
    'no-redeclare': 'off', // TypeScript extension
    'no-regex-spaces': 'error',
    'no-shadow': 'off', // TypeScript extension
    'no-shadow-restricted-names': 'error',
    'no-throw-literal': 'error',
    'no-trailing-spaces': 'error',
    'no-undef': 'error',
    'no-unexpected-multiline': 'error',
    'no-unreachable': 'error',
    'no-unused-vars': 'off', // TypeScript extension
    'no-use-before-define': 'off', // TypeScript extension
    'no-useless-rename': 'error',
    'no-var': 'error',
    'object-curly-spacing': 'off', // TypeScript extension
    'object-shorthand': 'error',
    'padded-blocks': ['error', { classes: 'never' }],
    'prefer-const': ['error', { destructuring: 'all' }],
    'prefer-template': 'error',
    'quote-props': ['error', 'as-needed'],
    quotes: 'off', // TypeScript extension
    radix: 'error',
    'react/boolean-prop-naming': 'error',
    'react/jsx-boolean-value': ['error', 'never', {
      always: [
        // We always want isRange because of the DatePicker component. The type
        // of its props uses a union type, so the JSX needs to explicitly be a
        // boolean value, not just the presence of the prop.
        'isRange',
      ],
    }],
    'react/jsx-props-no-multi-spaces': 'error',
    'react/jsx-sort-props': 'error',
    'react/jsx-tag-spacing': ['error', {
      closingSlash: 'never',
      beforeSelfClosing: 'always',
      afterOpening: 'never',
    }],
    'react/jsx-uses-react': 'off',
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    semi: 'off', // TypeScript extension
    'space-before-function-paren': 'off', // TypeScript extension
    'space-in-parens': 'error',
    'space-infix-ops': 'off', // TypeScript extension
    'template-curly-spacing': 'error',
    yoda: 'error',
    '@typescript-eslint/array-type': ['error', { default: 'array' }],
    '@typescript-eslint/brace-style': 'error',
    '@typescript-eslint/comma-dangle': ['error', 'always-multiline'],
    '@typescript-eslint/comma-spacing': ['error', { before: false, after: true }],
    '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
    '@typescript-eslint/consistent-type-imports': 'error',
    '@typescript-eslint/keyword-spacing': 'error',
    '@typescript-eslint/member-delimiter-style': 'error',
    '@typescript-eslint/method-signature-style': 'error',
    '@typescript-eslint/no-confusing-non-null-assertion': 'error',
    '@typescript-eslint/no-extra-semi': 'error',
    '@typescript-eslint/no-redeclare': 'error',
    '@typescript-eslint/no-shadow': 'off',
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/object-curly-spacing': ['error', 'always'],
    '@typescript-eslint/quotes': ['error', 'single'],
    '@typescript-eslint/semi': 'error',
    '@typescript-eslint/space-before-function-paren': 'error',
    '@typescript-eslint/space-infix-ops': ['error', { int32Hint: false }],
    '@typescript-eslint/type-annotation-spacing': 'error',
  },
};
