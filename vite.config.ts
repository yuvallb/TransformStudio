/// <reference types="vitest/config" />
import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig, loadEnv, type Plugin } from 'vite';

function injectGscVerification(token: string | undefined): Plugin {
  return {
    name: 'inject-gsc-verification',
    transformIndexHtml(html) {
      if (!token) return html;
      const tag = `<meta name="google-site-verification" content="${token}" />`;
      return html.replace('<head>', `<head>\n    ${tag}`);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const gscVerification = env.VITE_GSC_SITE_VERIFICATION;

  return {
  base: '/RefineIt/',
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
  plugins: [react(), tailwindcss(), injectGscVerification(gscVerification)],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['pyodide'],
  },
  worker: {
    format: 'es',
  },
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          setupFiles: './tests/setup.ts',
          include: ['tests/unit/**'],
          exclude: ['**/node_modules/**', '**/dist/**', 'tests/e2e/**', 'tests/integration/**'],
        },
      },
      {
        extends: true,
        test: {
          name: 'browser',
          include: ['tests/integration/**'],
          testTimeout: 120000,
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
};
});
