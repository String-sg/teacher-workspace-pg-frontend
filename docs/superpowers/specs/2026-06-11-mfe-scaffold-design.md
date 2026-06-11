# MFE Scaffold Design — teacher-workspace-pg-frontend

## Summary

Fresh scaffold for a Module Federation v2 remote application named `pg`, built with Rsbuild, React (latest stable), TypeScript, TailwindCSS 4 (prefixed `pg:`), Oxlint, Prettier, and Lefthook pre-commit hooks. Managed with pnpm 11 on Node 24.

## Architecture

```
teacher-workspace-pg-frontend/
├── .env.example              # PORT=3001
├── .node-version             # 24
├── .prettierrc               # Prettier config
├── lefthook.yml              # Pre-commit: oxlint, prettier --check, tsc --noEmit
├── oxlint.config.json        # Oxlint rules
├── package.json              # pnpm 11, pinned linter versions, engines: node 24
├── pnpm-lock.yaml
├── rsbuild.config.ts         # Rsbuild + MF v2 plugin
├── tsconfig.json             # Strict TypeScript
├── src/
│   ├── index.ts              # import('./bootstrap') — async boundary entry
│   ├── bootstrap.tsx         # Renders App into DOM
│   ├── App.tsx               # Placeholder component (exposed via MF)
│   └── index.css             # TailwindCSS 4 entry with pg: prefix
```

### Key decisions

- `index.ts` → `bootstrap.tsx` split required for Module Federation async chunk loading.
- TailwindCSS 4 uses CSS-first config with `@utility prefix(pg)` — no `tailwind.config.js`.
- No ESLint — Oxlint is the sole linter.
- Dev server port read from `process.env.PORT` with fallback to `3001`.

## Module Federation Config

```ts
// rsbuild.config.ts
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';

export default defineConfig({
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
  server: {
    port: Number(process.env.PORT) || 3001,
  },
});
```

- Remote name: `pg`
- Exposed module: `./App` → `src/App.tsx`
- Shared dependencies: `react`, `react-dom` (avoids duplicate instances with host)

## Entry Points

### src/index.ts

```ts
import('./bootstrap');
```

Async boundary required by Module Federation to allow shared dependencies to resolve before the app renders.

### src/bootstrap.tsx

```tsx
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
```

### src/App.tsx

```tsx
export default function App() {
  return <div className="pg:p-4 pg:text-lg">PG Module loaded</div>;
}
```

Placeholder component exposed to the host. Uses TailwindCSS with `pg:` prefix.

## TailwindCSS 4

### src/index.css

```css
@import 'tailwindcss' prefix(pg);
```

All utility classes are prefixed with `pg:` (e.g., `pg:flex`, `pg:text-lg`, `pg:p-4`). This prevents class collisions with the host app's styles.

## Linting & Formatting

### Oxlint

- Pinned version in `package.json` (exact, e.g., `"oxlint": "0.16.6"`)
- Config in `oxlint.config.json` with recommended + React rules enabled
- Sole linter — no ESLint

### Prettier

- Pinned version in `package.json` (exact)
- Config in `.prettierrc`
- Handles formatting only — no rule overlap with Oxlint

### TypeScript

- `tsconfig.json` with `strict: true`
- `tsc --noEmit` for type-checking (Rsbuild handles compilation)
- Target: ESNext, module: ESNext, JSX: react-jsx

## Lefthook Pre-commit Hooks

```yaml
# lefthook.yml
pre-commit:
  parallel: true
  commands:
    lint:
      glob: '*.{ts,tsx}'
      run: pnpm oxlint {staged_files}
    format:
      glob: '*.{ts,tsx,css,json,md}'
      run: pnpm prettier --check {staged_files}
    typecheck:
      run: pnpm tsc --noEmit
```

All three gates run in parallel. Typecheck runs against the full project (not just staged files) since TypeScript needs full context.

## Package Scripts

```json
{
  "scripts": {
    "dev": "rsbuild dev",
    "build": "rsbuild build",
    "lint": "oxlint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit"
  }
}
```

## Hard Constraints

- Do not use Webpack — Rsbuild only
- Do not use npm or yarn — pnpm 11 only
- Do not use ESLint — Oxlint only
- Pin exact versions for oxlint, prettier, and all linter-related packages
- Use latest stable React
- Use Module Federation v2
- Use TailwindCSS 4 with `pg:` prefix
- Node 24

## Implementation Order (single PR, layered commits)

1. `pnpm init` + `package.json` (engines, packageManager field) + `.node-version` + `.env.example`
2. Rsbuild + React + TypeScript + MF v2 plugin config
3. `src/index.ts` + `src/bootstrap.tsx` + `src/App.tsx` (placeholder)
4. TailwindCSS 4 with `pg:` prefix (`src/index.css`)
5. Oxlint + Prettier (pinned versions, configs)
6. Lefthook pre-commit hooks
