import path from 'node:path';

import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import tailwindcss from '@tailwindcss/postcss';

export default defineConfig({
  source: {
    alias: {
      '~': path.resolve(__dirname, 'src'),
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
  },
});
