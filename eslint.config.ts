import eslintJs from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // 1. Global ignores - applies to all subsequent configurations
  {
    ignores: [
      'node_modules/',
      'lib/', // Assuming 'lib' is your distribution/build output for the package
      'dist/', // Common alternative for distribution/build output
      'coverage/', // Coverage reports
      // 'eslint.config.js', // In case you had a .js version before
    ],
  },

  // 2. ESLint's recommended rules - applies to all non-ignored files
  eslintJs.configs.recommended,

  // 3. Configuration for your SOURCE TypeScript files (type-aware)
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'], // Adjust if you don't use .tsx
    extends: [
      ...tseslint.configs.strictTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: true, // Uses the main tsconfig.json in the project root
        // tsconfigRootDir can be set if tsconfig.json is not in the root.
        // For ESM: import.meta.dirname can be used if eslint.config.ts is an ES module.
      },
    },
    rules: {
      // --- Rule Customizations & Additions for your Package's Source Files ---
      '@typescript-eslint/no-explicit-any': [
        'warn',
        {
          fixToUnknown: true,
          ignoreRestArgs: true,
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/ban-tslint-comment': 'off',
      '@typescript-eslint/consistent-type-definitions': ['warn', 'type'],
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/no-confusing-void-expression': 'off',
      // Add/adjust other rules as needed
    },
  },

  // 4. Configuration for eslint.config.ts ITSELF (optional, but good for type-checking the config)
  {
    files: ['eslint.config.ts'],
    extends: [
      // You might want to apply some base typescript rules, but perhaps not the full strictTypeChecked set
      // unless you want to be very strict with your config file's typings.
      // For example, using recommended TypeScript rules without demanding full type information initially:
      // ...tseslint.configs.recommended,
      // OR, if you want type-checking for eslint.config.ts:
      ...tseslint.configs.strictTypeChecked, // Requires parserOptions.project below
    ],
    languageOptions: {
      parserOptions: {
        // parser: tseslint.parser, // Usually inferred
        project: './tsconfig.eslint.json', // Link to the specific tsconfig for this file
        // tsconfigRootDir: __dirname, // Not needed if path is relative to eslint.config.ts
        // and __dirname is a CJS variable, ensure ESM context if used.
      },
    },
    rules: {
      // Rules specific to your eslint.config.ts, can be more relaxed
      '@typescript-eslint/no-explicit-any': 'off', // Config files might use `any` for flexibility
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      // Add any other rules or overrides for your config file
    },
  },
);
