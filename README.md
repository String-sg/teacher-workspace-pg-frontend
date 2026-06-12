# Teacher Workspace PG Frontend

Micro-frontend for the Posts (Create & Send) feature in Teacher Workspace. Built as a Module Federation remote consumed by the TW host shell.

## Tech Stack

- **React 19** + TypeScript 6
- **Rsbuild** with Module Federation
- **React Router 7** (data loaders)
- **TipTap** (rich text editor)
- **TailwindCSS 4** + shadcn/ui components
- **Vitest** + Testing Library

## Getting Started

```bash
pnpm install
pnpm dev
```

The dev server starts at `http://localhost:3001`. MSW intercepts all API calls with mock data so no backend is needed.

### Available Routes

| Route             | Page                                       |
| ----------------- | ------------------------------------------ |
| `/posts`          | Posts list (announcements + consent forms) |
| `/posts/new`      | Create new post                            |
| `/posts/:id`      | Post detail (read-only)                    |
| `/posts/:id/edit` | Edit draft                                 |

## Scripts

| Command           | Description                  |
| ----------------- | ---------------------------- |
| `pnpm dev`        | Start dev server (port 3001) |
| `pnpm build`      | Production build             |
| `pnpm test`       | Run tests (Vitest)           |
| `pnpm test:watch` | Run tests in watch mode      |
| `pnpm typecheck`  | TypeScript type checking     |
| `pnpm lint`       | Lint with oxlint             |
| `pnpm format`     | Format with oxfmt            |

## Project Structure

```
src/
├── features/posts/
│   ├── api/            # API client, types, mappers, error hierarchy
│   ├── components/     # Post-specific UI components
│   ├── hooks/          # useAutoSave, useUnsavedChangesGuard
│   ├── pages/          # Route-level pages (list, detail, create/edit)
│   ├── state/          # useReducer state management (actions, reducer)
│   └── validation/     # Form validation logic
├── components/ui/      # shadcn/ui foundation components
├── data/               # Domain types (posts-registry)
├── helpers/            # Shared utilities (tiptap, dateTime, attachments)
├── lib/                # Core utilities (cn, notify, validation-errors)
└── mocks/              # MSW handlers + fixtures (dev only)
```

## Architecture

### Data Flow

1. **Route loaders** fetch data via the API client before rendering
2. **useReducer** manages form state with a pure reducer
3. **Components** are presentational — receive props, emit callbacks
4. **API layer** handles all network I/O including the 3-step upload flow

### Module Federation

Exposed as remote `pg` with entry `./App`. The host shell imports it at runtime:

```js
// Host config
remotes: {
  pg: 'pg@http://localhost:3001/mf-manifest.json';
}
```

## Testing

```bash
pnpm test
```

87 tests across 8 files covering:

- API client (CSRF retry, error handling, schedule operations)
- API mappers (summary/detail/payload transformations)
- Form reducer (all action types)
- Validation (field rules, upload gates)
- Hooks (autosave, unsaved changes guard)
- Components (schedule picker, recipient summary)

## Mock Server (MSW)

In dev mode, MSW intercepts all `/api/web/2/staff/*` requests and returns fixture data. Mock fixtures live in `src/mocks/fixtures/`. The service worker starts before the app renders — no backend required for UI development.
