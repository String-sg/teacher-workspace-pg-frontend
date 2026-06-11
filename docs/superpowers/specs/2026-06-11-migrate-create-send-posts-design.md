# Migrate Create & Send Posts Features — Design Spec

**Issue**: [#51](https://github.com/String-sg/teacher-workspace-pg-frontend/issues/51)
**Date**: 2026-06-11
**Scope**: Full legacy parity — announcements + consent forms (post-with-responses)

## Overview

Port the complete post creation and sending features from `teacher-workspace-pg/web/` into the new MFE scaffold (`teacher-workspace-pg-frontend`). This includes compose, targeting, preview, schedule, draft/autosave, duplicate, file upload (3-step token flow), and validation for both announcement posts and consent-form posts.

## Architecture

### Approach: Decomposed Containers

The legacy 1660-line `CreatePostView.tsx` monolith is decomposed into focused modules:

- **`state/`** — pure reducer + actions (no side effects, independently testable)
- **`pages/`** — orchestrator components connecting loader data → reducer → UI → API
- **`components/`** — presentational, receive props, emit callbacks
- **`api/`** — all network I/O; no fetch calls outside this layer
- **`hooks/`** — reusable behavior (autosave, unsaved changes guard)
- **`validation/`** — pure validation functions

### File Structure

```
src/
├── features/
│   └── posts/
│       ├── api/
│       │   ├── client.ts          # fetch helpers, mutateApi, postMultipart, upload flow
│       │   ├── errors.ts          # PGError hierarchy
│       │   ├── mappers.ts         # wire <-> domain transformations
│       │   └── types.ts           # PG API response/payload types
│       ├── components/
│       │   ├── AttachmentSection.tsx
│       │   ├── DeletePostDialog.tsx
│       │   ├── DueDateSection.tsx
│       │   ├── EnquiryEmailSelector.tsx
│       │   ├── EventScheduleSection.tsx
│       │   ├── PostCard.tsx
│       │   ├── PostPreview.tsx
│       │   ├── PostTypePicker.tsx
│       │   ├── QuestionBuilder.tsx
│       │   ├── RecipientSelector.tsx
│       │   ├── ReminderSection.tsx
│       │   ├── ResponseTypeSelector.tsx
│       │   ├── RichTextEditor.tsx
│       │   ├── RichTextToolbar.tsx
│       │   ├── SchedulePickerDialog.tsx
│       │   ├── SendConfirmationDialog.tsx
│       │   ├── ShortcutsSection.tsx
│       │   ├── SplitPostButton.tsx
│       │   ├── VenueSection.tsx
│       │   └── WebsiteLinksSection.tsx
│       ├── hooks/
│       │   ├── useAutoSave.ts
│       │   └── useUnsavedChangesGuard.ts
│       ├── pages/
│       │   ├── CreatePostPage.tsx  # orchestrator: route loader + PostForm composition
│       │   ├── PostDetailPage.tsx  # detail view (read-only)
│       │   └── PostsListPage.tsx   # list view with cards
│       ├── state/
│       │   ├── actions.ts          # PostFormAction union type
│       │   ├── initial-state.ts    # INITIAL_STATE + PostFormState type
│       │   └── reducer.ts          # formReducer (pure function)
│       ├── validation/
│       │   └── create-post-validation.ts
│       └── index.ts                # barrel: re-exports pages + route config
├── lib/
│   ├── notify.ts                   # toast wrapper (Sonner)
│   ├── utils.ts                    # cn() utility
│   └── validation-errors.ts        # PostFormField type + field-level error helpers
├── components/
│   └── ui/                         # shadcn components (Button, Card, Dialog, Input, etc.)
├── data/
│   └── posts-registry.ts           # domain types (PGPost, PGStatus, FormQuestion, etc.)
└── App.tsx                         # Router setup with route definitions
```

## Technology Stack

| Concern       | Library                                  | Notes                                                   |
| ------------- | ---------------------------------------- | ------------------------------------------------------- |
| Routing       | react-router ^7.x                        | Data loaders for route-level fetching                   |
| Rich text     | @tiptap/react + starter-kit + extensions | underline, link, text-align, character-count, highlight |
| UI components | shadcn/ui (copied in)                    | App code imports only from `~/components/ui`            |
| Icons         | lucide-react                             | Same icon set as legacy                                 |
| Toasts        | sonner                                   | `notify.error()` / `notify.success()` wrapper           |
| Styling       | TailwindCSS 4 + `pg:` prefix             | Already configured in scaffold                          |
| Variants      | class-variance-authority                 | For component variant props                             |
| Utils         | clsx + tailwind-merge                    | Powers `cn()` utility                                   |

Radix packages are installed as transitive deps of shadcn components but never imported directly by app code.

## Data Flow

### Route Loading

```
CreatePostPage.loader() → Promise.all([
  loadPostByKind(id, kindParam),  // edit mode: existing post/draft
  fetchSchoolClasses(),           // recipient selector options
  fetchSchoolStaff(),             // staff selector options
  fetchSchoolStaffGroups(),       // staff group picker
  fetchSchoolStudents(),          // student search
  fetchSession(),                 // current user (for enquiry email default)
  fetchGroupsAssigned(),          // level + CCA tabs
  fetchCustomGroups(),            // custom groups tab
  getConfigs(),                   // feature flags (schedule, shortcuts)
])
```

### Form State (useReducer)

State shape (preserved from legacy):

```typescript
interface PostFormState {
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
  event?: PGEvent;
  venue?: string;
  websiteLinks: WebsiteLink[];
  shortcuts: string[];
  attachments: UploadingFile[];
  photos: UploadingFile[];
}
```

Action types cover all form mutations: SET_KIND, SET_TITLE, SET_DESCRIPTION_DOC, SET_RECIPIENTS, ADD_UPLOAD, UPDATE_UPLOAD, REMOVE_UPLOAD, SET_COVER_PHOTO, REORDER_PHOTOS, etc.

### Submit Flow

1. User clicks "Post" → `isCreatePostFormValid(state, selectedType)`
2. If invalid → `computeInlineErrors()` → render field-level messages
3. If valid → `SendConfirmationDialog` opens (shows recipient count)
4. On confirm:
   - Announcement: `buildAnnouncementPayload(state)` → `createAnnouncement(payload)`
   - Consent form: `buildConsentFormPayload(state)` → `createConsentForm(payload)`
5. On success → navigate to posts list

### Schedule Flow

1. User clicks "Schedule" → `SchedulePickerDialog` opens
2. User picks date/time within config-driven `schedule_window`
3. On confirm:
   - New post: `scheduleNewAnnouncementDraft()` or `scheduleNewConsentFormDraft()`
   - Existing draft: `scheduleExistingAnnouncementDraft()` or `scheduleExistingConsentFormDraft()`
4. On success → navigate to posts list

### AutoSave

- `useAutoSave` hook polls every 30s
- Compares serialized payload to last-saved snapshot (JSON.stringify equality)
- Calls `createDraft()`/`updateDraft()` (or consent-form equivalents) with AbortSignal
- Status indicator in UI: idle → saving → saved | error
- `shouldSave` gate: requires title OR description to be non-empty

### Upload (3-Step Token Flow)

1. **Pre-validation**: `POST /api/files/2/preUploadValidation` — file + metadata → `{attachmentId, presignedUrl, fields}`
2. **S3 upload**: `POST presignedUrl` — fields (ordered before file) + file blob
3. **Verification polling**: `GET /api/files/2/postUploadVerification?attachmentId=X` — poll until `{verified: true}` or timeout (30s)

Each step dispatches `UPDATE_UPLOAD` to reflect row status in the UI.

### Duplicate Flow

- From list: `duplicateAnnouncement(id)` or `duplicateConsentForm(id)`
- From draft: `duplicateAnnouncementDraft(id)` or `duplicateConsentFormDraft(id)`
- Returns new draft ID → navigate to edit page with new draft

## Error Handling

Preserved exactly from legacy:

| Error Class             | Trigger                           | Behavior                           |
| ----------------------- | --------------------------------- | ---------------------------------- |
| `PGSessionExpiredError` | resultCode -401/-4012             | Redirect to `/session-expired`     |
| `PGValidationError`     | resultCode -400/-4001/-4003/-4004 | Inline field errors (no toast)     |
| `PGCsrfError`           | resultCode -4013                  | One-shot token refresh + replay    |
| `PGTimeoutError`        | Client-side deadline              | Distinct from user-initiated abort |
| `PGNotFoundError`       | resultCode -404 or HTTP 404       | "Post not found" boundary          |
| `PGRedirectError`       | 302 with `redirect: 'manual'`     | Navigate to Location header        |
| `PGError` (generic)     | Any other failure                 | Toast via `notify.error()`         |

## Validation Rules

### Gate 1 — All Post Types

- Title: non-empty
- Description: non-empty, ≤ 2000 chars
- Enquiry email: non-empty
- Recipients: at least one selected
- All uploads: resolved (status `ready` or `error`)

### Gate 2 — Consent Forms Only

- Due date: required, must be today or later
- Reminder date (when ONE_TIME/DAILY): must fall in `[tomorrow, dueDate - 1]`

### Gate 3 — Pending Uploads

Submit blocked while any attachment/photo has status `uploading` or `verifying`.

## Feature Flag Integration

`getConfigs()` returns a flags payload that gates:

- Schedule send UI (calendar icon button)
- Duplicate action (in post list cards)
- Per-shortcut toggles (Travel Declaration, Edit Contact Details)

Flags default to off if the config endpoint fails.

## Unsaved Changes Guard

`useUnsavedChangesGuard(isDirty)` — registers `beforeunload` listener while form is dirty. Browser shows native "Leave site?" prompt.

## Preview

`PostPreview` renders the composed post as parents would see it in the PG app. Receives the current form state and renders a read-only preview panel (toggleable via Eye/EyeOff icon).

## Out of Scope

- Staff-in-charge editor/viewer access type (net-new, PGTW-7)
- Posts with Responses tracking (Epic 3)
- Post tracking and chasing (Epic 2)
- Post templates
- Extended rich-text beyond bold/italic/underline/lists/alignment
- In-app navigation blocking (needs `useBlocker` — tracked as follow-up)

## Migration Notes

- All domain types from `data/mock-pg-announcements.ts` move to `data/posts-registry.ts`
- Mapper functions from `api/mappers.ts` are ported with their test assertions
- The `~/components/comms/` directory (entity-selector, staff-selector, student-recipient-selector) moves to `features/posts/components/` since it's post-specific
- Existing test files (`.test.ts`/`.test.tsx`) are ported alongside their source files
