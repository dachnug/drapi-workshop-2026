/*
 * (C) 2026 HCL for DNUG, Apache 2.0 license
 */

import { describe, expect, it } from 'vitest';

import config from '../vite.config';

describe('vite config proxy', () => {
  it('proxies /api to keep.dnug.rocks in dev and preview', () => {
    const serverProxy = (config.server as { proxy: Record<string, { target: string; changeOrigin: boolean; secure: boolean }> })
      .proxy;
    const previewProxy = (config.preview as { proxy: Record<string, { target: string; changeOrigin: boolean; secure: boolean }> })
      .proxy;

    expect(serverProxy['/api']).toEqual({
      target: 'https://keep.dnug.rocks:8880',
      changeOrigin: true,
      secure: true
    });

    expect(previewProxy['/api']).toEqual(serverProxy['/api']);
  });
});
