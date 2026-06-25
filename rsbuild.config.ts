import path from 'node:path';

import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import tailwindcss from '@tailwindcss/postcss';

const S3_UPLOAD_ORIGIN = process.env.S3_UPLOAD_ORIGIN || '';
const connectSrc = ["'self'", S3_UPLOAD_ORIGIN].filter(Boolean).join(' ');

const cspPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src ${connectSrc}`,
  "worker-src 'self'",
  "object-src 'none'",
  "frame-src 'none'",
  "form-action 'self'",
  "base-uri 'self'",
].join('; ');

export default defineConfig({
  source: {
    alias: {
      '~': path.resolve(__dirname, 'src'),
    },
  },
  html: {
    meta: {
      'Content-Security-Policy-Report-Only': {
        'http-equiv': 'Content-Security-Policy-Report-Only',
        content: cspPolicy,
      },
    },
  },
  plugins: [
    pluginReact(),
    pluginModuleFederation({
      name: 'pg',
      exposes: {
        './App': './src/App.tsx',
      },
      shared: ['react', 'react-dom'],
    }),
  ],
  tools: {
    postcss: (_, { addPlugins }) => {
      addPlugins([tailwindcss()]);
    },
  },
  server: {
    port: Number(process.env.PORT) || 3001,
    publicDir: {
      ignore: ['**/mockServiceWorker.js'],
    },
  },
});
