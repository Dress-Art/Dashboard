import {defineConfig} from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        setupFiles: ['./vitest.setup.ts'],
        css: false,
        globals: true,
        include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
        // Stabilisation: utiliser des forks pour une meilleure isolation mémoire
        pool: 'forks',
        poolOptions: {
            forks: {
                maxForks: 1,
                minForks: 1,
                isolate: true,
                singleFork: false,
            },
        },
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            reportsDirectory: './coverage',
            all: true,
            exclude: [
                '**/node_modules/**',
                'src/messages/**',
                'src/test/**',
                'src/**/*.test.*',
                'src/**/__mocks__/**',
                '**/.next/**',
            ],
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
    },
})
