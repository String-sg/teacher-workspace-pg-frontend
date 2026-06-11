# Migrate Create & Send Posts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the complete post creation and sending features (announcements + consent forms) from `teacher-workspace-pg/web/` into the new MFE scaffold with decomposed architecture, full test coverage, and no `PG` prefix on types.

**Architecture:** Feature-sliced design under `src/features/posts/` with separated concerns: `api/` for network, `state/` for pure reducer logic, `components/` for presentational UI, `pages/` for route-level orchestrators, `hooks/` for reusable behavior, `validation/` for form rules. React Router v7 data loaders drive initial fetches; form state lives in `useReducer`.

**Tech Stack:** React 19, React Router 7, TipTap (rich text), shadcn/ui, Vitest + @testing-library, TailwindCSS 4 (`pg:` prefix), Sonner (toasts), Lucide (icons)

---

## Phase 1: Foundation (Dependencies, Config, Shared Utils)

### Task 1: Install dependencies

**Files:**

- Modify: `package.json`
- Modify: `tsconfig.json`

- [ ] **Step 1: Add runtime dependencies**

```bash
pnpm add react-router@^7 @tiptap/react @tiptap/starter-kit @tiptap/extension-underline @tiptap/extension-link @tiptap/extension-text-align @tiptap/extension-character-count @tiptap/extension-highlight @tiptap/pm lucide-react sonner class-variance-authority clsx tailwind-merge
```

- [ ] **Step 2: Add dev dependencies**

```bash
pnpm add -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom @types/react @types/react-dom
```

- [ ] **Step 3: Add path alias to tsconfig.json**

Add `"paths": { "~/*": ["./src/*"] }` and set `"baseUrl": "."`:

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
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "~/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Configure Rsbuild path alias**

In `rsbuild.config.ts`, add `source.alias`:

```typescript
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import path from 'node:path';

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
  source: {
    alias: {
      '~': path.resolve(__dirname, 'src'),
    },
  },
  tools: {
    postcss: (_, { addPlugins }) => {
      addPlugins([tailwindcss()]);
    },
  },
  server: {
    port: Number(process.env.PORT) || 3001,
  },
});
```

- [ ] **Step 5: Verify build still works**

Run: `pnpm build`
Expected: Build succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml tsconfig.json rsbuild.config.ts
git commit -m "chore: add runtime and dev dependencies for posts migration"
```

---

### Task 2: Vitest configuration

**Files:**

- Create: `vitest.config.ts`
- Create: `src/test-setup.ts`
- Modify: `package.json` (add test scripts)

- [ ] **Step 1: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '~': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
});
```

- [ ] **Step 2: Create src/test-setup.ts**

```typescript
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 3: Add test scripts to package.json**

Add to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Create a smoke test to verify config**

Create `src/smoke.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

describe('vitest setup', () => {
  it('runs tests', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run tests**

Run: `pnpm test`
Expected: 1 test passes.

- [ ] **Step 6: Delete smoke test and commit**

```bash
rm src/smoke.test.ts
git add vitest.config.ts src/test-setup.ts package.json
git commit -m "chore: configure Vitest with jsdom and testing-library"
```

---

### Task 3: Shared utilities (cn, notify, validation-errors)

**Files:**

- Create: `src/lib/utils.ts`
- Create: `src/lib/notify.ts`
- Create: `src/lib/validation-errors.ts`

- [ ] **Step 1: Create src/lib/utils.ts**

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 2: Create src/lib/notify.ts**

```typescript
import { toast } from 'sonner';

export const notify = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
};
```

- [ ] **Step 3: Create src/lib/validation-errors.ts**

```typescript
import { ValidationError } from '~/features/posts/api/errors';

export type PostFormField = 'title' | 'description' | 'enquiryEmail' | 'recipients' | 'dueDate';

export function reportValidationError(err: ValidationError): string {
  switch (err.resultCode) {
    case -4001:
      return 'Enquiry email is required.';
    case -4003:
      return 'Description formatting is invalid. Please simplify and try again.';
    case -4004:
      return 'Description is too long. Maximum 2000 characters.';
    default:
      return err.message;
  }
}

export function fieldForValidationError(err: ValidationError): PostFormField | undefined {
  if (err.fieldPath === 'title') return 'title';
  if (err.fieldPath === 'description' || err.fieldPath === 'richTextContent') return 'description';
  if (err.fieldPath === 'enquiryEmailAddress' || err.fieldPath === 'enquiryEmail') {
    return 'enquiryEmail';
  }
  switch (err.resultCode) {
    case -4001:
      return 'enquiryEmail';
    case -4003:
    case -4004:
      return 'description';
    default:
      return undefined;
  }
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: Note — this will fail until errors.ts exists (Task 5). Proceed to next task.

- [ ] **Step 5: Commit**

```bash
git add src/lib/
git commit -m "feat: add shared utilities (cn, notify, validation-errors)"
```

---

### Task 4: Domain types (posts-registry)

**Files:**

- Create: `src/data/posts-registry.ts`

- [ ] **Step 1: Create src/data/posts-registry.ts**

Port all domain types from legacy `data/mock-pg-announcements.ts`, dropping the `PG` prefix:

```typescript
import type { ApiConsentFormHistoryEntry } from '~/features/posts/api/types';

export type PostStatus = 'posted' | 'scheduled' | 'draft' | 'posting';
export type ResponseType = 'view-only' | 'acknowledge' | 'yes-no';

export const POST_STATUS_BADGE: Record<
  PostStatus,
  { label: string; variant: 'success' | 'info' | 'secondary' }
> = {
  posted: { label: 'Posted', variant: 'success' },
  scheduled: { label: 'Scheduled', variant: 'info' },
  posting: { label: 'Posting', variant: 'info' },
  draft: { label: 'Draft', variant: 'secondary' },
};

export const RESPONSE_TYPE_META: Record<ResponseType, { label: string; description: string }> = {
  'view-only': { label: 'View Only', description: 'Parents can read but not respond' },
  acknowledge: { label: 'Acknowledge', description: 'Parents must acknowledge receipt' },
  'yes-no': { label: 'Yes / No', description: 'Parents respond with Yes or No' },
};

export type ResponseTypeWithResponse = 'acknowledge' | 'yes-no';

export function requiresResponse(rt: ResponseType): rt is ResponseTypeWithResponse {
  return rt === 'acknowledge' || rt === 'yes-no';
}

export type Ownership = 'mine' | 'shared';

export interface Shortcut {
  id: string;
  label: string;
  url: string;
}

export interface WebsiteLink {
  url: string;
  title: string;
}

export type FormQuestionType = 'free-text' | 'mcq';

export type FormQuestion =
  | { id: string; text: string; description?: string; type: 'free-text' }
  | { id: string; text: string; description?: string; type: 'mcq'; options: [string, ...string[]] };

export interface Recipient {
  studentId: string;
  studentName: string;
  classLabel: string;
  indexNumber?: string;
  readStatus: 'read' | 'unread';
  respondedAt?: string;
  formResponse?: 'yes' | 'no';
  acknowledgedAt?: string;
  questionAnswers?: Record<string, string>;
  pgStatus?: 'onboarded' | 'not-onboarded';
  replyByParent?: string | null;
}

export type TargetType = 'class' | 'group' | 'cca' | 'level';

export interface AnnouncementTarget {
  type: TargetType;
  id: number;
  label: string;
}

export interface AnnouncementStats {
  totalCount: number;
  readCount: number;
  responseCount: number;
  yesCount: number;
  noCount: number;
}

export interface UploadedFile {
  localId: string;
  kind: 'file' | 'photo';
  name: string;
  size: number;
  mimeType: string;
  status: 'ready';
  attachmentId: number;
  url: string;
  thumbnailUrl?: string;
  isCover?: boolean;
}

export type ReminderConfig =
  | { type: 'NONE'; lastDate?: string }
  | { type: 'ONE_TIME'; date: string }
  | { type: 'DAILY'; date: string };

export interface PostEvent {
  start: string;
  end: string;
  venue?: string;
}

export type ConsentFormHistoryEntry = ApiConsentFormHistoryEntry;

export interface ConsentFormRecipient {
  studentId: string;
  studentName: string;
  classLabel: string;
  indexNumber?: string;
  response: 'YES' | 'NO' | null;
  respondedAt: string | null;
  replyByParent?: string | null;
  parentType?: string | null;
  contactNumber?: string | null;
  pgStatus: 'onboarded' | 'not-onboarded';
}

export interface ConsentFormStats {
  totalCount: number;
  yesCount: number;
  noCount: number;
  pendingCount: number;
}

export type ConsentFormStatus = 'open' | 'closed' | 'posting' | 'scheduled' | 'draft';

export const CONSENT_FORM_STATUS_BADGE: Record<
  ConsentFormStatus,
  { label: string; variant: 'success' | 'info' | 'secondary' }
> = {
  open: { label: 'Open', variant: 'success' },
  closed: { label: 'Closed', variant: 'secondary' },
  posting: { label: 'Posting', variant: 'info' },
  scheduled: { label: 'Scheduled', variant: 'info' },
  draft: { label: 'Draft', variant: 'secondary' },
};

export interface AnnouncementPost {
  kind: 'announcement';
  id: AnnouncementId | AnnouncementDraftId;
  title: string;
  description: string;
  richTextContent?: Record<string, unknown> | null;
  status: PostStatus;
  responseType: ResponseType;
  ownership: Ownership;
  role?: 'owner' | 'viewer';
  recipients: Recipient[];
  stats: AnnouncementStats;
  postedAt?: string;
  scheduledAt?: string;
  createdAt?: string;
  createdBy: string;
  staffInCharge?: string;
  staffOwnerIds?: number[];
  targets?: AnnouncementTarget[];
  enquiryEmail?: string;
  shortcuts?: Shortcut[];
  websiteLinks?: WebsiteLink[];
  questions?: FormQuestion[];
  dueDate?: string;
  attachments?: UploadedFile[];
  photos?: UploadedFile[];
  scheduledSendFailureCode?: string | null;
}

export interface ConsentFormPost {
  kind: 'form';
  id: ConsentFormId | ConsentFormDraftId;
  title: string;
  description: string;
  richTextContent?: Record<string, unknown> | null;
  status: ConsentFormStatus;
  responseType: 'acknowledge' | 'yes-no';
  ownership: Ownership;
  role?: 'owner' | 'viewer';
  recipients: ConsentFormRecipient[];
  stats: ConsentFormStats;
  postedAt?: string;
  scheduledAt?: string;
  createdAt?: string;
  createdBy: string;
  staffInCharge?: string;
  staffOwnerIds?: number[];
  targets?: AnnouncementTarget[];
  enquiryEmail?: string;
  shortcuts?: Shortcut[];
  websiteLinks?: WebsiteLink[];
  questions: FormQuestion[];
  consentByDate: string;
  reminder: ReminderConfig;
  event?: PostEvent;
  history: ConsentFormHistoryEntry[];
  attachments?: UploadedFile[];
  photos?: UploadedFile[];
  scheduledSendFailureCode?: string | null;
}

export type Post = AnnouncementPost | ConsentFormPost;

export type BadgeVariant = 'success' | 'info' | 'secondary' | 'destructive';

export const SCHEDULED_FAILURE_REASON: Record<string, string> = {
  UPSTREAM_TIMEOUT: "The messaging service didn't respond in time.",
  RECIPIENT_INVALID: 'Some recipients are no longer valid.',
  ATTACHMENT_REJECTED: 'An attachment was blocked by virus scan.',
};

export function describeScheduledSendFailure(code: string | null | undefined): string | null {
  if (!code) return null;
  return SCHEDULED_FAILURE_REASON[code] ?? 'Something went wrong on our side.';
}

export function getPostStatusBadge(post: Post): { label: string; variant: BadgeVariant } {
  if (post.status === 'scheduled' && post.scheduledSendFailureCode) {
    return { label: 'Send failed', variant: 'destructive' };
  }
  return post.kind === 'form'
    ? CONSENT_FORM_STATUS_BADGE[post.status]
    : POST_STATUS_BADGE[post.status];
}

// ─── Branded IDs + type guards ────────────────────────────────────────────────

export type AnnouncementId = string & { readonly __brand: 'AnnouncementId' };
export type AnnouncementDraftId = `annDraft_${string}` & {
  readonly __brand: 'AnnouncementDraftId';
};
export type ConsentFormId = `cf_${string}` & { readonly __brand: 'ConsentFormId' };
export type ConsentFormDraftId = `cfDraft_${string}` & { readonly __brand: 'ConsentFormDraftId' };
export type PostId = AnnouncementId | AnnouncementDraftId | ConsentFormId | ConsentFormDraftId;

export function isConsentFormId(id: PostId): id is ConsentFormId {
  return id.startsWith('cf_') && !id.startsWith('cfDraft_');
}

export function isAnnouncementDraftId(id: PostId): id is AnnouncementDraftId {
  return id.startsWith('annDraft_');
}

export function isConsentFormDraftId(id: PostId): id is ConsentFormDraftId {
  return id.startsWith('cfDraft_');
}

export function parsePostId(raw: string): PostId | null {
  if (/^cfDraft_\d+$/.test(raw)) return raw as ConsentFormDraftId;
  if (/^cf_\d+$/.test(raw)) return raw as ConsentFormId;
  if (/^annDraft_\d+$/.test(raw)) return raw as AnnouncementDraftId;
  if (/^\d+$/.test(raw)) return raw as AnnouncementId;
  return null;
}

export function postKindFromId(id: PostId): 'announcement' | 'form' {
  return isConsentFormId(id) || isConsentFormDraftId(id) ? 'form' : 'announcement';
}

export function postHref(post: Post, opts?: { edit?: boolean }): string {
  const base = opts?.edit ? `/posts/${post.id}/edit` : `/posts/${post.id}`;
  return `${base}?kind=${post.kind}`;
}

export function validatePostRoute(rawId: string, kindParam: string | null): PostId | null {
  const parsed = parsePostId(rawId);
  if (!parsed) return null;
  const isForm = isConsentFormId(parsed) || isConsentFormDraftId(parsed);
  if (kindParam === 'form' && !isForm) return null;
  if (kindParam === 'announcement' && isForm) return null;
  return parsed;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/data/posts-registry.ts
git commit -m "feat: add domain types and post registry (no PG prefix)"
```

---

## Phase 2: API Layer

### Task 5: Error hierarchy

**Files:**

- Create: `src/features/posts/api/errors.ts`

- [ ] **Step 1: Create src/features/posts/api/errors.ts**

```typescript
export class AppError extends Error {
  readonly resultCode: number;
  readonly httpStatus: number;

  constructor(message: string, resultCode: number, httpStatus: number) {
    super(message);
    this.name = 'AppError';
    this.resultCode = resultCode;
    this.httpStatus = httpStatus;
  }
}

export class SessionExpiredError extends AppError {
  constructor(message: string, resultCode: number, httpStatus: number) {
    super(message, resultCode, httpStatus);
    this.name = 'SessionExpiredError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, resultCode: number, httpStatus: number) {
    super(message, resultCode, httpStatus);
    this.name = 'NotFoundError';
  }
}

export class TimeoutError extends AppError {
  constructor(message = 'Request timed out.') {
    super(message, -999, 0);
    this.name = 'TimeoutError';
  }
}

export class CsrfError extends AppError {
  constructor(message: string, resultCode: number, httpStatus: number) {
    super(message, resultCode, httpStatus);
    this.name = 'CsrfError';
  }
}

export class RedirectError extends AppError {
  readonly location: string | null;

  constructor(location: string | null) {
    super('Request redirected.', -4031, 302);
    this.name = 'RedirectError';
    this.location = location;
  }
}

export class ValidationError extends AppError {
  readonly fieldPath?: string;
  readonly subCode?: string;

  constructor(
    message: string,
    resultCode: number,
    httpStatus: number,
    extras?: { fieldPath?: string; subCode?: string },
  ) {
    super(message, resultCode, httpStatus);
    this.name = 'ValidationError';
    this.fieldPath = extras?.fieldPath;
    this.subCode = extras?.subCode;
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: Passes (errors.ts has no external deps beyond base classes).

- [ ] **Step 3: Commit**

```bash
git add src/features/posts/api/errors.ts
git commit -m "feat: add error hierarchy (no PG prefix)"
```

---

### Task 6: API types

**Files:**

- Create: `src/features/posts/api/types.ts`

- [ ] **Step 1: Create src/features/posts/api/types.ts**

Port the full `types.ts` from legacy, dropping `PGApi` prefix → `Api` prefix. This is a direct copy with prefix renaming. The file is ~530 lines — copy the entire contents from `teacher-workspace-pg/web/api/types.ts` and find-replace:

- `PGApi` → `Api`
- `PGApiConsentFormHistoryEntry` → `ApiConsentFormHistoryEntry` (exported, used by posts-registry)

The resulting type names: `ApiAnnouncementStatus`, `ApiStaffOwner`, `ApiAnnouncementStudent`, `ApiConsentFormStudent`, `ApiImage`, `ApiAttachment`, `ApiWebsiteLink`, `ApiShortcutLink`, `ApiAnnouncementTarget`, `ApiCustomQuestion`, `ApiConsentFormHistoryEntry`, `ApiAnnouncementSummary`, `ApiAnnouncementDetail`, `ApiAnnouncementDraft`, `ApiConsentFormDraft`, `ApiGroupTarget`, `ApiCreateAnnouncementPayload`, `ApiCreateDraftPayload`, `ApiScheduleDraftPayload`, `ApiDuplicateAnnouncementResponse`, `ApiDuplicateConsentFormResponse`, `ApiConsentFormSummary`, `ApiReminderType`, `ApiConsentFormDetail`, `ApiCreateConsentFormPayload`, `ApiCreateConsentFormDraftPayload`, `ApiSchoolStaff`, `ApiSchoolStaffList`, `ApiStaffGroupItem`, `ApiStaffGroups`, `ApiSchoolClass`, `ApiSchoolStudent`, `ApiGroupsAssignedClass`, `ApiGroupsAssignedCcaGroup`, `ApiGroupsAssigned`, `ApiCustomGroupSummary`, `ApiCustomGroupsList`, `ApiCustomGroupDetail`, `ApiCustomGroupDetailStudent`, `ApiCustomGroupSharedStaff`, `ApiCreateCustomGroupResponse`, `ApiClassDetail`, `ApiSession`, `ApiConfig`, `ApiUserProfile`, `ApiConsentFormList`, `ApiAnnouncementList`, `ApiConsentFormStatus`.

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: Passes.

- [ ] **Step 3: Commit**

```bash
git add src/features/posts/api/types.ts
git commit -m "feat: add API types (no PG prefix)"
```

---

### Task 7: API client

**Files:**

- Create: `src/features/posts/api/client.ts`

- [ ] **Step 1: Create src/features/posts/api/client.ts**

Port the full `client.ts` from legacy. Key changes:

- Import errors from `./errors` (new names: `AppError`, `SessionExpiredError`, `NotFoundError`, `CsrfError`, `ValidationError`, `TimeoutError`, `RedirectError`)
- Import types from `./types` (new `Api*` prefixed names)
- Import mappers from `./mappers` (same function names)
- Import `notify` from `~/lib/notify`
- Import domain types from `~/data/posts-registry` (new names without `PG` prefix)
- All function signatures and logic remain identical

The file is ~1083 lines — copy from legacy and apply the prefix renames mechanically.

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: May have errors until mappers.ts exists. Proceed.

- [ ] **Step 3: Commit**

```bash
git add src/features/posts/api/client.ts
git commit -m "feat: add API client with error handling and upload flow"
```

---

### Task 8: API mappers

**Files:**

- Create: `src/features/posts/api/mappers.ts`

- [ ] **Step 1: Create src/features/posts/api/mappers.ts**

Port the full `mappers.ts` from legacy (~1019 lines). Key changes:

- Import domain types from `~/data/posts-registry` (without `PG` prefix)
- Import API types from `./types` (with `Api` prefix instead of `PGApi`)
- Import `UploadingFile` from `~/features/posts/state/initial-state` (instead of from CreatePostView)
- Import tiptap helpers from a local `~/helpers/tiptap` module (port that too)
- All mapper function names remain the same: `mapAnnouncementSummary`, `mapAnnouncementDetail`, `mapAnnouncementDraftDetail`, `mapConsentFormSummaryToPost`, `mapConsentFormDetail`, `mapConsentFormDraftDetail`, `buildAnnouncementPayload`, `buildConsentFormPayload`, `toPGCreatePayload`, `toPGConsentFormCreatePayload`, `toPGConsentFormDraftPayload`, `mergeAndDedup`

Also create `src/helpers/tiptap.ts` — port the `extractTextFromTiptap` and `textToTiptapDoc` functions from the legacy `helpers/tiptap.ts`.

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: May have errors until state/initial-state.ts exists. Proceed.

- [ ] **Step 3: Commit**

```bash
git add src/features/posts/api/mappers.ts src/helpers/tiptap.ts
git commit -m "feat: add API mappers and tiptap helpers"
```

---

## Phase 3: State Management

### Task 9: Form state types and initial state

**Files:**

- Create: `src/features/posts/state/initial-state.ts`

- [ ] **Step 1: Create src/features/posts/state/initial-state.ts**

Port `PostFormState`, `UploadingFile`, and `INITIAL_STATE` from legacy `CreatePostView.tsx` lines 219-354:

```typescript
import type { SelectedEntity } from '~/features/posts/components/RecipientSelector';
import type { FormQuestion, PostEvent, ReminderConfig, ResponseType } from '~/data/posts-registry';
import type { WebsiteLink } from '~/features/posts/components/WebsiteLinksSection';

export interface UploadingFile {
  localId: string;
  kind: 'file' | 'photo';
  name: string;
  size: number;
  mimeType: string;
  status: 'uploading' | 'verifying' | 'ready' | 'error';
  attachmentId?: number;
  url?: string;
  thumbnailUrl?: string;
  isCover?: boolean;
  error?: string;
}

export interface PostFormState {
  kind: 'announcement' | 'form';
  title: string;
  description: string;
  descriptionDoc: Record<string, unknown> | null;
  selectedRecipients: SelectedEntity[];
  responseType: ResponseType;
  questions: FormQuestion[];
  selectedStaff: SelectedEntity[];
  enquiryEmail: string;
  dueDate: string;
  reminder: ReminderConfig;
  event?: PostEvent;
  venue?: string;
  websiteLinks: WebsiteLink[];
  shortcuts: string[];
  attachments: UploadingFile[];
  photos: UploadingFile[];
}

export const INITIAL_STATE: PostFormState = {
  kind: 'announcement',
  title: '',
  description: '',
  descriptionDoc: null,
  selectedRecipients: [],
  responseType: 'view-only',
  questions: [],
  selectedStaff: [],
  enquiryEmail: '',
  dueDate: '',
  reminder: { type: 'NONE' },
  event: undefined,
  venue: '',
  websiteLinks: [],
  shortcuts: [],
  attachments: [],
  photos: [],
};
```

- [ ] **Step 2: Commit**

```bash
git add src/features/posts/state/initial-state.ts
git commit -m "feat: add PostFormState type and INITIAL_STATE"
```

---

### Task 10: Form actions

**Files:**

- Create: `src/features/posts/state/actions.ts`

- [ ] **Step 1: Create src/features/posts/state/actions.ts**

Port the `PostFormAction` union type from legacy `CreatePostView.tsx` lines 297-330:

```typescript
import type { FormQuestion, ResponseType } from '~/data/posts-registry';
import type { SelectedEntity } from '~/features/posts/components/RecipientSelector';
import type { ReminderConfig, PostEvent } from '~/data/posts-registry';
import type { UploadingFile } from './initial-state';

export type PostFormAction =
  | { type: 'SET_KIND'; payload: 'announcement' | 'form' }
  | { type: 'SET_TITLE'; payload: string }
  | { type: 'SET_DESCRIPTION_DOC'; payload: { doc: Record<string, unknown>; text: string } }
  | { type: 'SET_RESPONSE_TYPE'; payload: ResponseType }
  | { type: 'SET_RECIPIENTS'; payload: SelectedEntity[] }
  | { type: 'ADD_QUESTION' }
  | { type: 'UPDATE_QUESTION'; id: string; payload: Partial<FormQuestion> }
  | { type: 'REMOVE_QUESTION'; id: string }
  | { type: 'MOVE_QUESTION'; id: string; direction: 'up' | 'down' }
  | { type: 'SET_STAFF'; payload: SelectedEntity[] }
  | { type: 'SET_EMAIL'; payload: string }
  | { type: 'SET_DUE_DATE'; payload: string }
  | { type: 'SET_REMINDER'; payload: ReminderConfig }
  | { type: 'SET_EVENT'; payload: PostEvent | undefined }
  | { type: 'SET_VENUE'; payload: string }
  | { type: 'ADD_WEBSITE_LINK' }
  | { type: 'REMOVE_WEBSITE_LINK'; index: number }
  | { type: 'UPDATE_WEBSITE_LINK'; index: number; field: 'url' | 'title'; value: string }
  | { type: 'SET_SHORTCUTS'; payload: string[] }
  | {
      type: 'ADD_UPLOAD';
      kind: 'file' | 'photo';
      payload: { localId: string; name: string; size: number; mimeType: string };
    }
  | {
      type: 'UPDATE_UPLOAD';
      kind: 'file' | 'photo';
      localId: string;
      patch: Partial<UploadingFile>;
    }
  | { type: 'REMOVE_UPLOAD'; kind: 'file' | 'photo'; localId: string }
  | { type: 'SET_COVER_PHOTO'; localId: string }
  | { type: 'REORDER_PHOTOS'; from: number; to: number };
```

- [ ] **Step 2: Commit**

```bash
git add src/features/posts/state/actions.ts
git commit -m "feat: add PostFormAction union type"
```

---

### Task 11: Form reducer

**Files:**

- Create: `src/features/posts/state/reducer.ts`
- Create: `src/features/posts/state/reducer.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/features/posts/state/reducer.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { formReducer } from './reducer';
import { INITIAL_STATE } from './initial-state';

describe('formReducer', () => {
  it('SET_TITLE updates title', () => {
    const state = formReducer(INITIAL_STATE, { type: 'SET_TITLE', payload: 'Hello' });
    expect(state.title).toBe('Hello');
  });

  it('SET_KIND changes kind', () => {
    const state = formReducer(INITIAL_STATE, { type: 'SET_KIND', payload: 'form' });
    expect(state.kind).toBe('form');
  });

  it('ADD_UPLOAD adds an entry to attachments', () => {
    const state = formReducer(INITIAL_STATE, {
      type: 'ADD_UPLOAD',
      kind: 'file',
      payload: { localId: 'abc', name: 'doc.pdf', size: 1024, mimeType: 'application/pdf' },
    });
    expect(state.attachments).toHaveLength(1);
    expect(state.attachments[0].status).toBe('uploading');
    expect(state.attachments[0].localId).toBe('abc');
  });

  it('ADD_UPLOAD for photo sets first as cover', () => {
    const state = formReducer(INITIAL_STATE, {
      type: 'ADD_UPLOAD',
      kind: 'photo',
      payload: { localId: 'p1', name: 'img.png', size: 2048, mimeType: 'image/png' },
    });
    expect(state.photos[0].isCover).toBe(true);
  });

  it('REMOVE_UPLOAD removes by localId', () => {
    const withFile = formReducer(INITIAL_STATE, {
      type: 'ADD_UPLOAD',
      kind: 'file',
      payload: { localId: 'abc', name: 'doc.pdf', size: 1024, mimeType: 'application/pdf' },
    });
    const state = formReducer(withFile, { type: 'REMOVE_UPLOAD', kind: 'file', localId: 'abc' });
    expect(state.attachments).toHaveLength(0);
  });

  it('ADD_WEBSITE_LINK respects max 3 cap', () => {
    let state = INITIAL_STATE;
    for (let i = 0; i < 4; i++) {
      state = formReducer(state, { type: 'ADD_WEBSITE_LINK' });
    }
    expect(state.websiteLinks).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/features/posts/state/reducer.test.ts`
Expected: FAIL — `formReducer` not found.

- [ ] **Step 3: Implement reducer**

Create `src/features/posts/state/reducer.ts`. Port the full `formReducer` from legacy `CreatePostView.tsx` lines 356-540. The function signature:

```typescript
import type { PostFormAction } from './actions';
import type { PostFormState, UploadingFile } from './initial-state';
import type { FormQuestion } from '~/data/posts-registry';

const MAX_WEBSITE_LINKS = 3;

export function formReducer(state: PostFormState, action: PostFormAction): PostFormState {
  switch (action.type) {
    case 'SET_KIND':
      return { ...state, kind: action.payload };
    case 'SET_TITLE':
      return { ...state, title: action.payload };
    case 'SET_DESCRIPTION_DOC':
      return { ...state, descriptionDoc: action.payload.doc, description: action.payload.text };
    case 'SET_RESPONSE_TYPE':
      return { ...state, responseType: action.payload };
    case 'SET_RECIPIENTS':
      return { ...state, selectedRecipients: action.payload };
    case 'ADD_QUESTION': {
      const newQuestion: FormQuestion = { id: crypto.randomUUID(), text: '', type: 'free-text' };
      return { ...state, questions: [...state.questions, newQuestion] };
    }
    case 'UPDATE_QUESTION':
      return {
        ...state,
        questions: state.questions.map((q) => {
          if (q.id !== action.id) return q;
          const updated = { ...q, ...action.payload };
          if (action.payload.type === 'mcq' && q.type !== 'mcq') {
            return {
              id: q.id,
              text: updated.text,
              type: 'mcq' as const,
              options: (action.payload as { options?: [string, ...string[]] }).options ?? ['', ''],
            };
          }
          if (action.payload.type === 'free-text' && q.type !== 'free-text') {
            return { id: q.id, text: updated.text, type: 'free-text' as const };
          }
          if (q.type === 'mcq') {
            return {
              ...q,
              ...action.payload,
              type: 'mcq' as const,
              options: (action.payload as { options?: [string, ...string[]] }).options ?? q.options,
            };
          }
          return { ...q, ...action.payload, type: 'free-text' as const };
        }),
      };
    case 'REMOVE_QUESTION':
      return { ...state, questions: state.questions.filter((q) => q.id !== action.id) };
    case 'MOVE_QUESTION': {
      const idx = state.questions.findIndex((q) => q.id === action.id);
      if (idx === -1) return state;
      const newIdx = action.direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= state.questions.length) return state;
      const newQuestions = [...state.questions];
      [newQuestions[idx], newQuestions[newIdx]] = [newQuestions[newIdx], newQuestions[idx]];
      return { ...state, questions: newQuestions };
    }
    case 'SET_STAFF':
      return { ...state, selectedStaff: action.payload };
    case 'SET_EMAIL':
      return { ...state, enquiryEmail: action.payload };
    case 'SET_DUE_DATE':
      return { ...state, dueDate: action.payload };
    case 'SET_REMINDER':
      return { ...state, reminder: action.payload };
    case 'SET_EVENT':
      return { ...state, event: action.payload };
    case 'SET_VENUE':
      return { ...state, venue: action.payload };
    case 'ADD_WEBSITE_LINK': {
      if (state.websiteLinks.length >= MAX_WEBSITE_LINKS) return state;
      return { ...state, websiteLinks: [...state.websiteLinks, { url: '', title: '' }] };
    }
    case 'REMOVE_WEBSITE_LINK':
      return { ...state, websiteLinks: state.websiteLinks.filter((_, i) => i !== action.index) };
    case 'UPDATE_WEBSITE_LINK':
      return {
        ...state,
        websiteLinks: state.websiteLinks.map((link, i) =>
          i === action.index ? { ...link, [action.field]: action.value } : link,
        ),
      };
    case 'SET_SHORTCUTS':
      return { ...state, shortcuts: action.payload };
    case 'ADD_UPLOAD': {
      const slot: 'attachments' | 'photos' = action.kind === 'file' ? 'attachments' : 'photos';
      const list = state[slot];
      const entry: UploadingFile = {
        ...action.payload,
        kind: action.kind,
        status: 'uploading',
        ...(action.kind === 'photo' ? { isCover: list.length === 0 } : {}),
      };
      return { ...state, [slot]: [...list, entry] };
    }
    case 'UPDATE_UPLOAD': {
      const slot: 'attachments' | 'photos' = action.kind === 'file' ? 'attachments' : 'photos';
      return {
        ...state,
        [slot]: state[slot].map((f) =>
          f.localId === action.localId ? { ...f, ...action.patch } : f,
        ),
      };
    }
    case 'REMOVE_UPLOAD': {
      const slot: 'attachments' | 'photos' = action.kind === 'file' ? 'attachments' : 'photos';
      return { ...state, [slot]: state[slot].filter((f) => f.localId !== action.localId) };
    }
    case 'SET_COVER_PHOTO':
      return {
        ...state,
        photos: state.photos.map((p) => ({ ...p, isCover: p.localId === action.localId })),
      };
    case 'REORDER_PHOTOS': {
      const photos = [...state.photos];
      const [moved] = photos.splice(action.from, 1);
      photos.splice(action.to, 0, moved);
      return { ...state, photos };
    }
  }
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test -- src/features/posts/state/reducer.test.ts`
Expected: All 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/posts/state/
git commit -m "feat: add form reducer with tests"
```

---

### Task 12: Validation logic

**Files:**

- Create: `src/features/posts/validation/create-post-validation.ts`
- Create: `src/features/posts/validation/create-post-validation.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/features/posts/validation/create-post-validation.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  isCreatePostFormValid,
  computeInlineErrors,
  hasPendingUploads,
} from './create-post-validation';
import { INITIAL_STATE } from '../state/initial-state';
import type { PostFormState } from '../state/initial-state';

const VALID_STATE: PostFormState = {
  ...INITIAL_STATE,
  title: 'Test Post',
  description: 'A description that is not empty',
  enquiryEmail: 'teacher@school.edu.sg',
  selectedRecipients: [{ id: '1', label: 'Class 1A', type: 'class' }] as any,
};

describe('isCreatePostFormValid', () => {
  it('returns false for empty state', () => {
    expect(isCreatePostFormValid(INITIAL_STATE, 'announcement')).toBe(false);
  });

  it('returns true for valid announcement', () => {
    expect(isCreatePostFormValid(VALID_STATE, 'announcement')).toBe(true);
  });

  it('returns false for consent form without due date', () => {
    expect(isCreatePostFormValid(VALID_STATE, 'post-with-response')).toBe(false);
  });

  it('returns true for consent form with due date', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const iso = tomorrow.toISOString().slice(0, 10);
    const state = { ...VALID_STATE, dueDate: iso };
    expect(isCreatePostFormValid(state, 'post-with-response')).toBe(true);
  });
});

describe('computeInlineErrors', () => {
  it('returns errors for all empty fields', () => {
    const errors = computeInlineErrors(INITIAL_STATE, 'announcement');
    expect(errors.title).toBeDefined();
    expect(errors.description).toBeDefined();
    expect(errors.enquiryEmail).toBeDefined();
    expect(errors.recipients).toBeDefined();
  });
});

describe('hasPendingUploads', () => {
  it('returns false with no uploads', () => {
    expect(hasPendingUploads(INITIAL_STATE)).toBe(false);
  });

  it('returns true with uploading attachment', () => {
    const state = {
      ...INITIAL_STATE,
      attachments: [
        {
          localId: 'x',
          kind: 'file' as const,
          name: 'f',
          size: 1,
          mimeType: '',
          status: 'uploading' as const,
        },
      ],
    };
    expect(hasPendingUploads(state)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/features/posts/validation/create-post-validation.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement validation**

Create `src/features/posts/validation/create-post-validation.ts` — port directly from legacy `containers/createPostValidation.ts`, importing `PostFormState` from `../state/initial-state` and using `PostKind` type (defined as `'announcement' | 'post-with-response'` — matches the PostTypePicker component's output):

```typescript
import type { PostFormState } from '../state/initial-state';
import type { PostFormField } from '~/lib/validation-errors';

export type PostKind = 'announcement' | 'post-with-response';

export function isCreatePostFormValid(
  state: PostFormState,
  selectedType: PostKind | null,
): boolean {
  const baseValid =
    state.title.trim().length > 0 &&
    state.enquiryEmail.trim().length > 0 &&
    state.selectedRecipients.length > 0 &&
    state.description.trim().length > 0 &&
    state.description.length <= 2000;

  if (!baseValid) return false;

  if (selectedType === 'post-with-response' && state.dueDate.trim().length === 0) return false;

  const allUploadsResolved = [...state.attachments, ...state.photos].every(
    (u) => u.status === 'ready' || u.status === 'error',
  );
  if (!allUploadsResolved) return false;

  if (selectedType !== 'post-with-response') return true;

  const today = todayIso();
  if (state.dueDate < today) return false;

  if (state.reminder.type === 'ONE_TIME' || state.reminder.type === 'DAILY') {
    const r = state.reminder.date;
    if (!r) return false;
    const min = addDaysIso(today, 1);
    const max = addDaysIso(state.dueDate, -1);
    if (r < min || r > max) return false;
  }

  return true;
}

export function computeInlineErrors(
  state: PostFormState,
  selectedType: PostKind | null,
): Partial<Record<PostFormField, string>> {
  const errors: Partial<Record<PostFormField, string>> = {};
  if (!state.title.trim()) errors.title = 'Please enter a title.';
  if (!state.description.trim() || state.description.length > 2000)
    errors.description = 'Please write the post details.';
  if (!state.enquiryEmail.trim()) errors.enquiryEmail = 'Please select an enquiry email.';
  if (state.selectedRecipients.length === 0)
    errors.recipients = 'Please select at least one recipient.';
  if (selectedType === 'post-with-response' && !state.dueDate.trim())
    errors.dueDate = 'Please set a due date for responses.';
  return errors;
}

export function hasPendingUploads(state: PostFormState): boolean {
  return [...state.attachments, ...state.photos].some(
    (u) => u.status === 'uploading' || u.status === 'verifying',
  );
}

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test -- src/features/posts/validation/create-post-validation.test.ts`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/features/posts/validation/
git commit -m "feat: add form validation with tests"
```

---

## Phase 4: Hooks

### Task 13: useAutoSave hook

**Files:**

- Create: `src/features/posts/hooks/useAutoSave.ts`
- Create: `src/features/posts/hooks/useAutoSave.test.tsx`

- [ ] **Step 1: Create src/features/posts/hooks/useAutoSave.ts**

Port directly from legacy `hooks/useAutoSave.ts` — no type renames needed (it's generic). Copy the file contents verbatim.

- [ ] **Step 2: Port the test file**

Copy `teacher-workspace-pg/web/hooks/useAutoSave.test.tsx` to `src/features/posts/hooks/useAutoSave.test.tsx`. Update imports to use relative paths.

- [ ] **Step 3: Run tests**

Run: `pnpm test -- src/features/posts/hooks/useAutoSave.test.tsx`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/features/posts/hooks/useAutoSave.ts src/features/posts/hooks/useAutoSave.test.tsx
git commit -m "feat: add useAutoSave hook with tests"
```

---

### Task 14: useUnsavedChangesGuard hook

**Files:**

- Create: `src/features/posts/hooks/useUnsavedChangesGuard.ts`
- Create: `src/features/posts/hooks/useUnsavedChangesGuard.test.tsx`

- [ ] **Step 1: Create src/features/posts/hooks/useUnsavedChangesGuard.ts**

Port directly from legacy — identical file:

```typescript
import { useEffect } from 'react';

export function useUnsavedChangesGuard(isDirty: boolean): void {
  useEffect(() => {
    if (!isDirty) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = '';
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);
}
```

- [ ] **Step 2: Port the test file**

Copy from legacy, update imports.

- [ ] **Step 3: Run tests**

Run: `pnpm test -- src/features/posts/hooks/useUnsavedChangesGuard.test.tsx`
Expected: Pass.

- [ ] **Step 4: Commit**

```bash
git add src/features/posts/hooks/
git commit -m "feat: add useUnsavedChangesGuard hook with tests"
```

---

## Phase 5: UI Components

### Task 15: shadcn/ui foundation components

**Files:**

- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/card.tsx`
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/label.tsx`
- Create: `src/components/ui/dialog.tsx`
- Create: `src/components/ui/popover.tsx`
- Create: `src/components/ui/select.tsx`
- Create: `src/components/ui/separator.tsx`
- Create: `src/components/ui/badge.tsx`
- Create: `src/components/ui/index.ts`

- [ ] **Step 1: Copy shadcn components from legacy**

Copy each shadcn component from `teacher-workspace-pg/web/components/ui/`. These files are standard shadcn/ui components — copy them verbatim. Update the `cn` import to point to `~/lib/utils`.

- [ ] **Step 2: Create barrel export**

Create `src/components/ui/index.ts` that re-exports all components.

- [ ] **Step 3: Install required Radix packages**

Based on the shadcn components, install the required Radix primitives:

```bash
pnpm add @radix-ui/react-dialog @radix-ui/react-popover @radix-ui/react-select @radix-ui/react-label @radix-ui/react-separator @radix-ui/react-slot
```

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: Passes.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/ package.json pnpm-lock.yaml
git commit -m "feat: add shadcn/ui foundation components"
```

---

### Task 16: Post-specific components (batch 1 — simple presentational)

**Files:**

- Create: `src/features/posts/components/PostTypePicker.tsx`
- Create: `src/features/posts/components/ResponseTypeSelector.tsx`
- Create: `src/features/posts/components/EnquiryEmailSelector.tsx`
- Create: `src/features/posts/components/VenueSection.tsx`
- Create: `src/features/posts/components/DueDateSection.tsx`
- Create: `src/features/posts/components/ShortcutsSection.tsx`
- Create: `src/features/posts/components/WebsiteLinksSection.tsx`

- [ ] **Step 1: Port each component from legacy**

Copy from `teacher-workspace-pg/web/components/posts/`, updating:

- Import paths: `~/components/ui` → same; `~/data/mock-pg-announcements` → `~/data/posts-registry`
- Type names: drop `PG` prefix
- Keep component logic identical

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: May have warnings; fix any import issues.

- [ ] **Step 3: Commit**

```bash
git add src/features/posts/components/
git commit -m "feat: add simple post form components (type picker, selectors, sections)"
```

---

### Task 17: Post-specific components (batch 2 — complex interactive)

**Files:**

- Create: `src/features/posts/components/RichTextEditor.tsx`
- Create: `src/features/posts/components/RichTextToolbar.tsx`
- Create: `src/features/posts/components/RecipientSelector.tsx`
- Create: `src/features/posts/components/AttachmentSection.tsx`
- Create: `src/features/posts/components/QuestionBuilder.tsx`
- Create: `src/features/posts/components/ReminderSection.tsx`
- Create: `src/features/posts/components/EventScheduleSection.tsx`

- [ ] **Step 1: Port each component from legacy**

Same approach as Task 16 — copy with import path + type prefix updates.

The `RecipientSelector.tsx` also needs the `SelectedEntity` type to be exported (used by state/initial-state). Define it here:

```typescript
export interface SelectedEntity {
  id: string | number;
  label: string;
  type: string;
  count?: number;
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`

- [ ] **Step 3: Commit**

```bash
git add src/features/posts/components/
git commit -m "feat: add interactive post form components (editor, recipients, attachments)"
```

---

### Task 18: Post-specific components (batch 3 — dialogs and cards)

**Files:**

- Create: `src/features/posts/components/SendConfirmationDialog.tsx`
- Create: `src/features/posts/components/SchedulePickerDialog.tsx`
- Create: `src/features/posts/components/DeletePostDialog.tsx`
- Create: `src/features/posts/components/PostPreview.tsx`
- Create: `src/features/posts/components/PostCard.tsx`
- Create: `src/features/posts/components/SplitPostButton.tsx`

- [ ] **Step 1: Port each component from legacy**

Same approach — copy with import path + type prefix updates.

- [ ] **Step 2: Port component tests**

Copy test files for `SchedulePickerDialog.test.tsx`, `ReminderSection.test.tsx`, `RichTextToolbar.test.tsx`, `summarise-recipients.test.ts` from legacy. Update imports.

- [ ] **Step 3: Run tests**

Run: `pnpm test -- src/features/posts/components/`
Expected: All ported component tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/features/posts/components/
git commit -m "feat: add dialog components, preview, and post card with tests"
```

---

## Phase 6: Pages & Routing

### Task 19: PostsListPage

**Files:**

- Create: `src/features/posts/pages/PostsListPage.tsx`

- [ ] **Step 1: Port PostsView from legacy**

Port `containers/PostsView.tsx` to `pages/PostsListPage.tsx`. This page:

- Has a route loader that calls `loadPostsList()` and `loadConsentPostsList()`
- Renders post cards with status badges, duplicate actions, delete actions
- Supports filtering by post type and status

Update imports to use new paths and type names.

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`

- [ ] **Step 3: Commit**

```bash
git add src/features/posts/pages/PostsListPage.tsx
git commit -m "feat: add PostsListPage with loader"
```

---

### Task 20: PostDetailPage

**Files:**

- Create: `src/features/posts/pages/PostDetailPage.tsx`

- [ ] **Step 1: Port PostDetailView from legacy**

Port `containers/PostDetailView.tsx`. This page:

- Has a route loader that calls `loadPostDetail()` or `loadConsentPostDetail()`
- Renders read-only post content with recipients table, stats, and action buttons
- Supports edit (navigate to create page with draft), delete, duplicate

- [ ] **Step 2: Commit**

```bash
git add src/features/posts/pages/PostDetailPage.tsx
git commit -m "feat: add PostDetailPage with loader"
```

---

### Task 21: CreatePostPage

**Files:**

- Create: `src/features/posts/pages/CreatePostPage.tsx`

- [ ] **Step 1: Port CreatePostView orchestrator from legacy**

Port `containers/CreatePostView.tsx` as the page-level orchestrator. This is the most complex page — it:

- Exports a `loader` function that fetches all selector data in parallel
- Connects `useReducer(formReducer, INITIAL_STATE)` with hydration from loader data (edit mode)
- Wires `useAutoSave` with draft creation/update
- Wires `useUnsavedChangesGuard`
- Composes all section components with dispatch callbacks
- Handles submit (send), schedule, and draft-save flows
- Shows inline validation errors

The key difference from legacy: the reducer, state, and validation are imported from separate modules rather than defined inline.

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: Passes.

- [ ] **Step 3: Commit**

```bash
git add src/features/posts/pages/CreatePostPage.tsx
git commit -m "feat: add CreatePostPage orchestrator with loader"
```

---

### Task 22: Router setup and App integration

**Files:**

- Modify: `src/App.tsx`
- Create: `src/features/posts/index.ts`

- [ ] **Step 1: Create barrel export**

Create `src/features/posts/index.ts`:

```typescript
export { PostsListPage, loader as postsListLoader } from './pages/PostsListPage';
export { PostDetailPage, loader as postDetailLoader } from './pages/PostDetailPage';
export { CreatePostPage, loader as createPostLoader } from './pages/CreatePostPage';
```

- [ ] **Step 2: Update App.tsx with router**

```typescript
import { createBrowserRouter, RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import {
  PostsListPage,
  postsListLoader,
  PostDetailPage,
  postDetailLoader,
  CreatePostPage,
  createPostLoader,
} from '~/features/posts';

const router = createBrowserRouter([
  {
    path: '/posts',
    element: <PostsListPage />,
    loader: postsListLoader,
  },
  {
    path: '/posts/new',
    element: <CreatePostPage />,
    loader: createPostLoader,
  },
  {
    path: '/posts/:id',
    element: <PostDetailPage />,
    loader: postDetailLoader,
  },
  {
    path: '/posts/:id/edit',
    element: <CreatePostPage />,
    loader: createPostLoader,
  },
]);

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}
```

- [ ] **Step 3: Typecheck and build**

Run: `pnpm typecheck && pnpm build`
Expected: Both pass.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/features/posts/index.ts
git commit -m "feat: wire up React Router with posts routes"
```

---

## Phase 7: API Client Tests

### Task 23: Port API client tests

**Files:**

- Create: `src/features/posts/api/client.test.ts`

- [ ] **Step 1: Port client.test.ts from legacy**

Copy `teacher-workspace-pg/web/api/client.test.ts`, updating:

- Error class imports: `PGError` → `AppError`, `PGValidationError` → `ValidationError`, etc.
- Type imports: `PGApi*` → `Api*`
- Keep test logic identical

- [ ] **Step 2: Run tests**

Run: `pnpm test -- src/features/posts/api/client.test.ts`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/features/posts/api/client.test.ts
git commit -m "test: port API client tests"
```

---

### Task 24: Port API mapper tests

**Files:**

- Create: `src/features/posts/api/mappers.test.ts`

- [ ] **Step 1: Port mappers.test.ts from legacy**

Copy `teacher-workspace-pg/web/api/mappers.test.ts`, updating type imports.

- [ ] **Step 2: Run tests**

Run: `pnpm test -- src/features/posts/api/mappers.test.ts`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/features/posts/api/mappers.test.ts
git commit -m "test: port API mapper tests"
```

---

## Phase 8: Final Verification

### Task 25: Full test suite and typecheck

**Files:** None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `pnpm test`
Expected: All tests pass.

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors.

- [ ] **Step 3: Run lint**

Run: `pnpm lint`
Expected: No errors (or only pre-existing warnings).

- [ ] **Step 4: Run build**

Run: `pnpm build`
Expected: Builds successfully.

- [ ] **Step 5: Run format check**

Run: `pnpm format`
Expected: All files formatted.

- [ ] **Step 6: Commit any format fixes**

```bash
git add -A
git commit -m "chore: format all migrated files"
```

---

### Task 26: Dev server smoke test

**Files:** None (manual verification)

- [ ] **Step 1: Start dev server**

Run: `pnpm dev`

- [ ] **Step 2: Navigate to /posts**

Open `http://localhost:3001/posts` in a browser. Verify the posts list page renders (against mock data or empty state).

- [ ] **Step 3: Navigate to /posts/new**

Verify the create post form renders with:

- Post type picker
- Title input
- Rich text editor
- Recipient selector
- Enquiry email selector
- Post/Schedule buttons

- [ ] **Step 4: Stop dev server**

Ctrl+C to stop.
