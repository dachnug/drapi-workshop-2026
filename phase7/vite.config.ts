/*
 * (C) 2026 HCL for DNUG, Apache 2.0 license
 */

/**
 * @fileoverview Vite configuration. Sets up the dev-server and preview
 * proxies, forwarding `/api`, `/oauth`, and `/.well-known` requests to the
 * Keep backend at `https://keep.dnug.rocks:8880`.
 */

import { defineConfig } from 'vite';

const apiProxy = {
  '/api': {
    target: 'https://keep.dnug.rocks:8880',
    changeOrigin: true,
    secure: true
  },
  '/oauth': {
    target: 'https://keep.dnug.rocks:8880',
    changeOrigin: true,
    secure: true
  },
  '/.well-known': {
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
