# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # Dev server at localhost:3001 (MSW mocks all API calls)
pnpm build            # Production build (Module Federation remote)
pnpm test             # Run all tests
pnpm test -- src/features/posts/state/reducer.test.ts  # Run single test file
pnpm typecheck        # tsc --noEmit
pnpm lint             # oxlint
pnpm format           # oxfmt (formatting)
```

Pre-commit hooks (lefthook): lint, format check, and typecheck run in parallel on staged files. All three must pass.

## Architecture

This is a **Module Federation remote** MFE exposed as `pg` with entry `./App`. It's consumed by the Teacher Workspace host shell at runtime.

### Feature-Sliced Design

All post-related code lives under `src/features/posts/` with strict layer separation:

- **`api/`** — All network I/O. No `fetch` calls exist outside this layer. Uses a pgw-web envelope format (`{ body, resultCode }`). Error hierarchy in `errors.ts` drives error handling (CSRF retry, session expiry redirect, validation inline errors).
- **`state/`** — Pure `useReducer` state management. `PostFormState` + `PostFormAction` union. No side effects in the reducer.
- **`pages/`** — Route-level orchestrators. Each exports a `loader` function (React Router v7 data loaders) and a default component. Loaders fetch in parallel via `Promise.all`.
- **`components/`** — Presentational. Receive props, emit callbacks. No direct API calls.
- **`hooks/`** — `useAutoSave` (30s polling with AbortSignal) and `useUnsavedChangesGuard` (beforeunload).
- **`validation/`** — Pure functions. `isCreatePostFormValid` + `computeInlineErrors` + `hasPendingUploads`.

### Branded Post IDs

Post IDs use a client-side prefix convention to route to the correct API endpoint:

- `annDraft_<n>` → `/announcements/drafts/<n>`
- `cfDraft_<n>` → `/consentForms/drafts/<n>`
- `cf_<n>` → `/consentForms/<n>`
- `<n>` (bare number) → `/announcements/<n>`

These are TypeScript branded types defined in `src/data/posts-registry.ts`. The `parsePostId` function parses raw route params into the correct branded type.

### Upload Flow (3-Step)

1. `POST /api/files/2/preUploadValidation` → get `{ attachmentId, presignedUrl, fields }`
2. `POST presignedUrl` with FormData (fields before file blob)
3. Poll `GET /api/files/2/postUploadVerification?attachmentId=X` until `{ verified: true }`

Each step dispatches `UPDATE_UPLOAD` to the reducer to reflect progress in UI.

### MSW Mock Server

In dev mode (`import.meta.env.DEV`), MSW starts before the app renders (dynamic import of `App` deferred until after `worker.start()`). Handlers in `src/mocks/handlers.ts`, fixtures in `src/mocks/fixtures/`. All responses use the pgw-web envelope: `{ body: <data>, resultCode: 1 }`. Detail endpoints return array-wrapped single items: `{ body: [<detail>], resultCode: 1 }`.

## Conventions

- **Path alias:** `~` maps to `src/` (configured in tsconfig + rsbuild)
- **No `PG` prefix on types** — legacy used `PGApiAnnouncementDetail`, here it's `ApiAnnouncementDetail`. Domain types (in `posts-registry.ts`) have no prefix at all.
- **UI components:** `src/components/ui/` are shadcn-style primitives using `@base-ui/react`. App code imports from `~/components/ui`.
- **CSS theme:** Radix Slate color scale + custom `twblue` brand, mapped to shadcn semantic tokens via CSS custom properties in `src/index.css`.
- **Formatter/Linter:** oxfmt (not prettier) for formatting, oxlint for linting. Imports are auto-sorted by oxfmt (external before relative).
- **GPG signing:** Commits require GPG signatures (configured in git). Use `git -c commit.gpgsign=false` if signing is unavailable in the environment.
