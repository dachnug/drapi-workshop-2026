/*
 * (C) 2026 HCL for DNUG, Apache 2.0 license
 */

import { defineConfig } from 'vite';

const apiProxy = {
  '/api': {
    target: 'https://keep.dnug.rocks:8880',
    changeOrigin: true,
    secure: true
  }
};

export default defineConfig({
  server: {
    proxy: apiProxy
  },
  preview: {
    proxy: apiProxy
  }
});
