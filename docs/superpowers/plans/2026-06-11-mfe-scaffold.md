# MFE Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold a Module Federation v2 remote application named `pg` with Rsbuild, React, TypeScript, TailwindCSS 4, Oxlint, Prettier, and Lefthook pre-commit hooks.

**Architecture:** Fresh repo initialized with pnpm 11, using Rsbuild as build tool with the MF v2 plugin. An async boundary (`index.ts` → `bootstrap.tsx`) enables shared dependency resolution. TailwindCSS 4 with `pg:` prefix prevents style collisions with the host app.

**Tech Stack:** Rsbuild 2.0.12, React 19.2.7, TypeScript 6.0.3, Module Federation 2.5.1, TailwindCSS 4.3.0, Oxlint 1.69.0, Prettier 3.8.4, Lefthook 2.1.9, pnpm 11.5.3, Node 24

---

## File Map

| File                 | Responsibility                                 |
| -------------------- | ---------------------------------------------- |
| `package.json`       | Dependencies, scripts, engines, packageManager |
| `.node-version`      | Node 24 for version managers                   |
| `.env.example`       | Documents configurable PORT                    |
| `tsconfig.json`      | Strict TypeScript config                       |
| `rsbuild.config.ts`  | Rsbuild + React plugin + MF v2 plugin          |
| `src/index.ts`       | Async boundary entry (dynamic import)          |
| `src/bootstrap.tsx`  | App mount point                                |
| `src/App.tsx`        | Placeholder component exposed via MF           |
| `src/index.css`      | TailwindCSS 4 with pg: prefix                  |
| `oxlint.config.json` | Oxlint rules                                   |
| `.prettierrc`        | Prettier config                                |
| `lefthook.yml`       | Pre-commit hook definitions                    |

---

### Task 1: Initialize project with pnpm

**Files:**

- Create: `package.json`
- Create: `.node-version`
- Create: `.env.example`
- Create: `.gitignore`

- [ ] **Step 1: Create `.node-version`**

```
24
```

- [ ] **Step 2: Create `.env.example`**

```
PORT=3001
```

- [ ] **Step 3: Create `.gitignore`**

```gitignore
node_modules/
dist/
.env
*.local
```

- [ ] **Step 4: Create `package.json`**

```json
{
  "name": "teacher-workspace-pg-frontend",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "rsbuild dev",
    "build": "rsbuild build",
    "lint": "oxlint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit"
  },
  "engines": {
    "node": ">=24"
  },
  "packageManager": "pnpm@11.5.3"
}
```

- [ ] **Step 5: Initialize pnpm and install core dependencies**

Run:

```bash
pnpm add react@19.2.7 react-dom@19.2.7
pnpm add -D @rsbuild/core@2.0.12 @rsbuild/plugin-react@2.0.1 @module-federation/rsbuild-plugin@2.5.1 typescript@6.0.3 @types/react@19.2.17 @types/react-dom@19.2.3
```

- [ ] **Step 6: Verify `pnpm-lock.yaml` was created**

Run:

```bash
ls pnpm-lock.yaml
```

Expected: file exists

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml .node-version .env.example .gitignore
git commit -m "chore(mfe): initialize project with pnpm 11 and core dependencies"
```

---

### Task 2: Configure Rsbuild + React + Module Federation v2

**Files:**

- Create: `tsconfig.json`
- Create: `rsbuild.config.ts`

- [ ] **Step 1: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

- [ ] **Step 2: Create `rsbuild.config.ts`**

```ts
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

- [ ] **Step 3: Verify TypeScript is happy with the config**

Run:

```bash
pnpm typecheck
```

Expected: No errors (no source files yet, so `tsc` exits cleanly or reports "no input files" — either is fine at this stage)

- [ ] **Step 4: Commit**

```bash
git add tsconfig.json rsbuild.config.ts
git commit -m "chore(mfe): add Rsbuild + MF v2 + TypeScript config"
```

---

### Task 3: Create source entry points and placeholder component

**Files:**

- Create: `src/index.ts`
- Create: `src/bootstrap.tsx`
- Create: `src/App.tsx`

- [ ] **Step 1: Create `src/index.ts`**

```ts
import('./bootstrap');
```

- [ ] **Step 2: Create `src/bootstrap.tsx`**

```tsx
import { createRoot } from 'react-dom/client';
import App from './App';

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
```

- [ ] **Step 3: Create `src/App.tsx`**

```tsx
export default function App() {
  return <div className="pg:p-4 pg:text-lg">PG Module loaded</div>;
}
```

- [ ] **Step 4: Run type-check to verify source compiles**

Run:

```bash
pnpm typecheck
```

Expected: PASS (no errors)

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "chore(mfe): add entry points and placeholder App component"
```

---

### Task 4: Integrate TailwindCSS 4 with pg: prefix

**Files:**

- Create: `src/index.css`

- [ ] **Step 1: Install TailwindCSS 4**

Run:

```bash
pnpm add -D tailwindcss@4.3.0 @tailwindcss/postcss
```

- [ ] **Step 2: Create `src/index.css`**

```css
@import 'tailwindcss' prefix(pg);
```

- [ ] **Step 2b: Add CSS import to `src/bootstrap.tsx`**

Add the import at the top of `src/bootstrap.tsx`:

```tsx
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
```

- [ ] **Step 3: Start dev server and verify it compiles**

Run:

```bash
pnpm dev
```

Expected: Dev server starts on the configured port (default 3001). Open browser — see "PG Module loaded" rendered with padding and larger text (TailwindCSS `pg:p-4 pg:text-lg` applied). Stop the server with Ctrl+C.

- [ ] **Step 4: Run production build and verify remote entry**

Run:

```bash
pnpm build
```

Expected: Build succeeds. Check output:

```bash
ls dist/remoteEntry.js 2>/dev/null || ls dist/mf-manifest.json 2>/dev/null
```

At least one of these files should exist (MF v2 remote entry artifact).

- [ ] **Step 5: Commit**

```bash
git add src/index.css src/bootstrap.tsx pnpm-lock.yaml package.json
git commit -m "chore(mfe): integrate TailwindCSS 4 with pg: prefix"
```

---

### Task 5: Configure Oxlint + Prettier (pinned versions)

**Files:**

- Create: `oxlint.config.json`
- Create: `.prettierrc`

- [ ] **Step 1: Install Oxlint and Prettier (exact versions)**

Run:

```bash
pnpm add -D oxlint@1.69.0 prettier@3.8.4 --save-exact
```

- [ ] **Step 2: Create `oxlint.config.json`**

```json
{
  "$schema": "https://raw.githubusercontent.com/oxc-project/oxc/main/npm/oxlint/configuration_schema.json",
  "plugins": ["react"],
  "rules": {},
  "categories": {
    "correctness": "error",
    "suspicious": "warn",
    "pedantic": "off",
    "style": "off"
  }
}
```

- [ ] **Step 3: Create `.prettierrc`**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

- [ ] **Step 4: Run Oxlint on source**

Run:

```bash
pnpm lint
```

Expected: PASS (no errors or warnings on the placeholder code)

- [ ] **Step 5: Run Prettier check**

Run:

```bash
pnpm format:check
```

Expected: Either passes or reports formatting diffs. If diffs exist, run `pnpm format` to fix them, then re-run `pnpm format:check` to confirm it passes.

- [ ] **Step 6: Run type-check to confirm nothing broke**

Run:

```bash
pnpm typecheck
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add oxlint.config.json .prettierrc package.json pnpm-lock.yaml
git commit -m "chore(mfe): add Oxlint and Prettier with pinned versions"
```

---

### Task 6: Configure Lefthook pre-commit hooks

**Files:**

- Create: `lefthook.yml`

- [ ] **Step 1: Install Lefthook**

Run:

```bash
pnpm add -D @evilmartians/lefthook@2.1.9 --save-exact
```

- [ ] **Step 2: Create `lefthook.yml`**

```yaml
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

- [ ] **Step 3: Install lefthook git hooks**

Run:

```bash
pnpm lefthook install
```

Expected: Output confirms hooks installed (e.g., "pre-commit hook set up successfully")

- [ ] **Step 4: Verify hooks trigger on commit**

Run:

```bash
git add lefthook.yml package.json pnpm-lock.yaml
git commit -m "chore(mfe): add Lefthook pre-commit hooks"
```

Expected: Commit succeeds. The pre-commit hook runs lint, format check, and typecheck — all pass.

---

### Task 7: Final verification

- [ ] **Step 1: Clean install from scratch**

Run:

```bash
rm -rf node_modules
pnpm install
```

Expected: Install succeeds with no errors

- [ ] **Step 2: Dev server starts**

Run:

```bash
pnpm dev &
sleep 3
curl -s http://localhost:3001 | grep -q "root" && echo "OK" || echo "FAIL"
kill %1
```

Expected: "OK" — the HTML contains a root div

- [ ] **Step 3: Production build produces MF remote entry**

Run:

```bash
pnpm build
ls dist/
```

Expected: `dist/` contains built assets including a remote entry file (`remoteEntry.js` or `mf-manifest.json`)

- [ ] **Step 4: All quality gates pass**

Run:

```bash
pnpm lint && pnpm format:check && pnpm typecheck
```

Expected: All three pass with exit code 0

- [ ] **Step 5: Commit any formatting fixes if needed**

If `pnpm format` made changes in earlier steps that weren't committed:

```bash
git add -A
git commit -m "chore(mfe): apply formatting fixes"
```
