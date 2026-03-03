import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        globalSetup: './test/globalSetup.ts',
        testTimeout: 30_000,
        hookTimeout: 60_000,
        // run integration tests serially — servers are shared state
        pool: 'forks',
        poolOptions: {
            forks: { singleFork: true },
        },
    },
});
