import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import sonarjs from 'eslint-plugin-sonarjs';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    { 
        ignores: [
            'dist', 
            'backups/**', 
            '**/_archive*/**',
            'debug/**',
            'scripts/**',
            '**/*.test.ts',
            '**/*.test.tsx',
            'src/test/**',
        ] 
    },
    {
        extends: [
            js.configs.recommended,
            ...tseslint.configs.recommended,
            sonarjs.configs.recommended,
        ],
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
        },
        plugins: {
            react,
        },
        rules: {
            ...react.configs.recommended.rules,
            ...react.configs['jsx-runtime'].rules,
            'react/no-unknown-property': 'off', // ThreejS / React-fiber için bazen gerekebiliyor
            'no-console': ['warn', { allow: ['warn', 'error'] }], // Console log'ları temizlemek için
            'sonarjs/cognitive-complexity': ['error', 15], // Fonksiyonlar çok karmaşık olmamalı
            'sonarjs/no-duplicate-string': 'warn', // Tekrar eden stringler uyarılır
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
    },
);
