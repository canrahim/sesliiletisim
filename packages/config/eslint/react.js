module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
    'jsx-a11y',
    'import'
  ],
  settings: {
    react: {
      version: 'detect'
    },
    'import/resolver': {
      typescript: true,
      node: true
    }
  },
  rules: {
    // TypeScript
    '@typescript-eslint/no-unused-vars': ['warn', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_' 
    }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'warn',
    
    // React
    'react/react-in-jsx-scope': 'off', // React 17+ doesn't need this
    'react/prop-types': 'off', // Using TypeScript
    'react/jsx-uses-react': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    
    // Import
    'import/order': ['warn', {
      groups: [
        'builtin',
        'external',
        'internal',
        ['parent', 'sibling'],
        'index',
        'object',
        'type'
      ],
      pathGroups: [
        {
          pattern: 'react',
          group: 'builtin',
          position: 'before'
        },
        {
          pattern: '@asforces/**',
          group: 'internal',
          position: 'before'
        }
      ],
      pathGroupsExcludedImportTypes: ['react'],
      'newlines-between': 'always',
      alphabetize: {
        order: 'asc',
        caseInsensitive: true
      }
    }],
    'import/no-unresolved': 'error',
    'import/no-named-as-default-member': 'off',
    
    // General
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-debugger': 'warn',
    'prefer-const': 'warn',
    'no-var': 'error'
  },
  ignorePatterns: [
    'node_modules',
    'dist',
    'build',
    '.turbo',
    '*.config.js',
    '*.config.ts'
  ]
};
