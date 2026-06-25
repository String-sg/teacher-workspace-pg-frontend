import type {
  AnnouncementDraftId,
  AnnouncementId,
  ConsentFormDraftId,
  ConsentFormId,
  AnnouncementPost,
  ConsentFormPost,
} from '~/data/posts-registry';
import { notify } from '~/lib/notify';

import {
  AppError,
  CsrfError,
  NotFoundError,
  RedirectError,
  SessionExpiredError,
  TimeoutError,
  ValidationError,
} from './errors';
import {
  mapAnnouncementDetail,
  mapAnnouncementDraftDetail,
  mapAnnouncementSummary,
  mapConsentFormDetail,
  mapConsentFormDraftDetail,
  mapConsentFormSummaryToPost,
  mergeAndDedup,
  toPGConsentFormCreatePayload,
  toPGConsentFormDraftPayload,
  toPGCreatePayload,
} from './mappers';
import type {
  ApiAnnouncementDetail,
  ApiAnnouncementDraft,
  ApiAnnouncementList,
  ApiCcaDetail,
  ApiClassDetail,
  ApiConfig,
  ApiConsentFormDetail,
  ApiConsentFormDraft,
  ApiConsentFormList,
  ApiCreateAnnouncementPayload,
  ApiCreateConsentFormDraftPayload,
  ApiCreateConsentFormPayload,
  ApiCreateCustomGroupResponse,
  ApiCreateDraftPayload,
  ApiCustomGroupDetail,
  ApiCustomGroupsList,
  ApiCustomGroupSummary,
  ApiDuplicateAnnouncementResponse,
  ApiDuplicateConsentFormResponse,
  ApiGroupTarget,
  ApiGroupsAssigned,
  ApiSchoolClass,
  ApiSchoolStaffList,
  ApiSchoolStudent,
  ApiStaffGroups,
  ApiSession,
  ApiUserProfile,
} from './types';

const API_BASE = '/api/web/2/staff';

// ─── Fetch helpers ──────────────────────────────────────────────────────────

// Real pgw-web wraps all responses as {body, resultCode, message, metadata};
// mock fixtures are raw. Detect the envelope by requiring both `body` and a
// numeric `resultCode` — no TW inner shape uses resultCode, so false positives
// are effectively impossible.
function unwrapEnvelope<T>(json: unknown): T {
  if (
    json !== null &&
    typeof json === 'object' &&
    'body' in json &&
    'resultCode' in json &&
    typeof (json as { resultCode: unknown }).resultCode === 'number'
  ) {
    return (json as { body: T }).body;
  }
  return json as T;
}

// Translates pgw's error envelope into a typed `AppError` subclass and applies
// side-effects (redirect for session loss, toast for generic failures) before
// rethrowing. Validation errors are thrown silently so containers can render
// them inline rather than as toasts.
async function handleErrorResponse(res: Response): Promise<never> {
  let resultCode: number | undefined;
  let errorReason: string | undefined;
  let fieldPath: string | undefined;
  let subCode: string | undefined;
  try {
    const body = (await res.clone().json()) as {
      resultCode?: number;
      message?: string;
      error?: { errorReason?: string; fieldPath?: string; subCode?: string };
    };
    resultCode = body.resultCode;
    errorReason = body.error?.errorReason ?? body.message;
    fieldPath = body.error?.fieldPath;
    subCode = body.error?.subCode;
  } catch {
    // Non-JSON body (e.g. HTML error page) — fall through with undefined fields.
  }

  const message = errorReason ?? `Request failed (${res.status}).`;
  const code = resultCode ?? res.status;

  switch (resultCode) {
    case -401:
    case -4012:
      if (typeof window !== 'undefined' && window.location.pathname !== '/session-expired') {
        window.location.href = '/session-expired';
      }
      throw new SessionExpiredError(message, code, res.status);
    case -404:
      throw new NotFoundError(message, code, res.status);
    case -4013:
      throw new CsrfError(message, code, res.status);
    case -400:
    case -4001:
    case -4003:
    case -4004:
      throw new ValidationError(message, code, res.status, { fieldPath, subCode });
    case -429:
      notify.error('Too many requests. Please slow down and try again.');
      throw new AppError(message, code, res.status);
    default:
      // Bare HTTP 404s (no pgw envelope) come from the mock's `http.NotFound`
      // or any upstream that returns 404 without a `resultCode`. Normalise to
      // `NotFoundError` so detail-route boundaries can render a 'Post not
      // found' page instead of a generic toast.
      if (res.status === 404) {
        throw new NotFoundError(message, code, res.status);
      }
      notify.error(message);
      throw new AppError(message, code, res.status);
  }
}

/**
 * Opaqueredirect (`type: 'opaqueredirect'`, status 0) or a bare 3xx with
 * `redirect: 'manual'` indicates a PG -4031 session-redirect. The browser
 * hides the Location header for opaqueredirects, but in jsdom / same-origin
 * / non-CORS contexts it's often still readable. Try it; navigate the window
 * when a Location is available, and always throw `RedirectError` so
 * callers (esp. route boundaries) can surface a terminal state instead of
 * silently parsing HTML as JSON.
 */
function handleRedirectResponse(res: Response): never {
  const location = res.headers.get('location');
  if (location && typeof window !== 'undefined') {
    try {
      // Accept absolute URLs and relative paths — PG confirmation pending (ask #9).
      new URL(location, window.location.origin);
      window.location.href = location;
    } catch {
      // Invalid URL — fall through to the thrown error below; the caller
      // decides how to recover.
    }
  }
  throw new RedirectError(location);
}

function isRedirectResponse(res: Response): boolean {
  return res.type === 'opaqueredirect' || (res.status >= 300 && res.status < 400);
}

async function fetchApi<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { redirect: 'manual', credentials: 'include' });
  if (isRedirectResponse(res)) handleRedirectResponse(res);
  if (!res.ok) await handleErrorResponse(res);
  return unwrapEnvelope<T>(await res.json());
}

/**
 * Root-level fetch that bypasses the `/api/web/2/staff` base. Used for
 * endpoints PG exposes at `/api/*` (currently just `/api/configs`). Kept
 * separate from `fetchApi` so the prefix remains the single source of truth
 * for the staff-scoped surface.
 */
async function fetchApiRoot<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`, { redirect: 'manual', credentials: 'include' });
  if (isRedirectResponse(res)) handleRedirectResponse(res);
  if (!res.ok) await handleErrorResponse(res);
  return unwrapEnvelope<T>(await res.json());
}

/**
 * Default deadlines for write + upload paths (U8). Write mutations get the
 * shorter budget because they're the tightest feedback loop (teacher waits on
 * the Send / Schedule button); uploads widen it because AV scan + S3 round
 * trips push past the 30-second mark in normal conditions.
 */
const DEFAULT_WRITE_TIMEOUT_MS = 30_000;
const DEFAULT_UPLOAD_TIMEOUT_MS = 60_000;

/**
 * Compose a caller's `AbortSignal` with a client-side timeout. The returned
 * `signal` aborts when either the caller aborts or the timeout elapses;
 * `didTimeout()` disambiguates so callers can surface a distinct
 * `TimeoutError` vs. re-throwing the caller's `AbortError`. The `dispose`
 * hook clears the timer once the request settles so pending timeouts don't
 * keep the event loop alive after success.
 */
function withTimeout(
  callerSignal: AbortSignal | undefined,
  timeoutMs: number,
): { signal: AbortSignal; dispose: () => void; didTimeout: () => boolean } {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const disposeTimer = () => clearTimeout(timer);

  if (callerSignal) {
    if (callerSignal.aborted) {
      disposeTimer();
      controller.abort();
    } else {
      callerSignal.addEventListener(
        'abort',
        () => {
          disposeTimer();
          controller.abort();
        },
        { once: true },
      );
    }
  }

  return {
    signal: controller.signal,
    dispose: disposeTimer,
    didTimeout: () => timedOut,
  };
}

/**
 * Refresh the CSRF token after a -4013 rejection. The real contract is still
 * pending PG confirmation (ask #6); as a pragmatic first pass, a lightweight
 * GET to the session endpoint is expected to bump PG's CSRF cookie via
 * Set-Cookie. If PG exposes a dedicated refresh endpoint later, swap the URL
 * here — callers in `mutateApi` / `postMultipart` are unaffected. Swallowed
 * errors keep the retry path functioning: if the refresh itself fails, the
 * replay will resurface a terminal `CsrfError` the caller can handle.
 */
async function refreshCsrfToken(): Promise<void> {
  try {
    await fetch(`${API_BASE}/session/current`, { method: 'GET', credentials: 'include' });
  } catch {
    // Ignore — the replay below will surface a terminal failure if the token
    // truly can't be refreshed.
  }
}

async function mutateApi<T>(
  method: 'POST' | 'PUT',
  path: string,
  body: unknown,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<T> {
  const timeout = withTimeout(options.signal, options.timeoutMs ?? DEFAULT_WRITE_TIMEOUT_MS);
  const attempt = async (): Promise<T> => {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: timeout.signal,
      redirect: 'manual',
      credentials: 'include',
    });
    if (isRedirectResponse(res)) handleRedirectResponse(res);
    if (!res.ok) await handleErrorResponse(res);
    // Handle empty responses (204 No Content or empty body)
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return unwrapEnvelope<T>(JSON.parse(text));
  };
  try {
    try {
      return await attempt();
    } catch (err) {
      // One-shot CSRF retry (U7). A second consecutive -4013 rethrows the
      // original `CsrfError` so callers can surface a terminal "please
      // refresh" state instead of looping forever.
      if (err instanceof CsrfError) {
        await refreshCsrfToken();
        return await attempt();
      }
      throw err;
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError' && timeout.didTimeout()) {
      throw new TimeoutError(
        `Request to ${path} timed out after ${options.timeoutMs ?? DEFAULT_WRITE_TIMEOUT_MS}ms.`,
      );
    }
    throw err;
  } finally {
    timeout.dispose();
  }
}

async function deleteApi(path: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    redirect: 'manual',
    credentials: 'include',
  });
  if (isRedirectResponse(res)) handleRedirectResponse(res);
  if (!res.ok) await handleErrorResponse(res);
}

/**
 * POST a `multipart/form-data` body to a root-prefixed path. Used for
 * `/api/files/*` where the payload is the raw file plus a few text fields,
 * not JSON. Shares `handleErrorResponse` and `unwrapEnvelope` with the JSON
 * helpers so errors surface the same way.
 */
async function postMultipart<T>(
  path: string,
  formData: FormData,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<T> {
  const timeout = withTimeout(options.signal, options.timeoutMs ?? DEFAULT_UPLOAD_TIMEOUT_MS);
  const attempt = async (): Promise<T> => {
    const res = await fetch(`/api${path}`, {
      method: 'POST',
      body: formData,
      signal: timeout.signal,
      redirect: 'manual',
      credentials: 'include',
    });
    if (isRedirectResponse(res)) handleRedirectResponse(res);
    if (!res.ok) await handleErrorResponse(res);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    if (!text) return undefined as T;
    return unwrapEnvelope<T>(JSON.parse(text));
  };
  try {
    try {
      return await attempt();
    } catch (err) {
      if (err instanceof CsrfError) {
        await refreshCsrfToken();
        return await attempt();
      }
      throw err;
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError' && timeout.didTimeout()) {
      throw new TimeoutError(
        `Upload to ${path} timed out after ${options.timeoutMs ?? DEFAULT_UPLOAD_TIMEOUT_MS}ms.`,
      );
    }
    throw err;
  } finally {
    timeout.dispose();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGS (feature flags)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * `/api/configs` is served outside the `/staff` base path (PG exposes it at
 * `/api/configs` root), so we call `fetchApiRoot` rather than `fetchApi`. The
 * response drives feature-flag gates (schedule-send, duplicate, shortcuts);
 * loaders fetch it once per route entry and pass it down via `useLoaderData`.
 *
 * Memoised at module scope so a given session only pays the RTT once. The
 * TTL (`CONFIGS_STALE_MS`) invalidates the cache so long-lived sessions pick
 * up flag flips without a hard refresh. Fetch failures fall back to an
 * all-flags-off shape — no toast, no banner; the gated UI simply hides.
 */
const CONFIGS_STALE_MS = 15 * 60 * 1000;
let configsPromise: Promise<ApiConfig> | null = null;
let configsLoadedAt = 0;

const EMPTY_CONFIG: ApiConfig = { flags: {}, configs: {} };

export function getConfigs(): Promise<ApiConfig> {
  const now = Date.now();
  if (!configsPromise || now - configsLoadedAt > CONFIGS_STALE_MS) {
    configsLoadedAt = now;
    configsPromise = fetchApiRoot<ApiConfig>('/configs').catch(() => {
      // Drop the negative result out of the cache on the next tick so the
      // following route entry re-fetches instead of waiting out the 15-min
      // TTL. Without this a single transient failure grounded the Schedule
      // and Duplicate UI for the rest of the session.
      configsLoadedAt = 0;
      configsPromise = null;
      return EMPTY_CONFIG;
    });
  }
  return configsPromise;
}

// ═══════════════════════════════════════════════════════════════════════════
// ANNOUNCEMENTS
// ═══════════════════════════════════════════════════════════════════════════

// ─── Read ───────────────────────────────────────────────────────────────────

function fetchAnnouncements() {
  return fetchApi<ApiAnnouncementList>('/announcements');
}

function fetchSharedAnnouncements() {
  return fetchApi<ApiAnnouncementList>('/announcements/shared');
}

async function fetchAnnouncementDetail(postId: AnnouncementId): Promise<ApiAnnouncementDetail> {
  // pgw-web wraps single-detail responses as `body: [<detail>]`; unwrap the array.
  const arr = await fetchApi<ApiAnnouncementDetail[]>(`/announcements/${postId}`);
  return arr[0];
}

async function fetchAnnouncementDraftDetail(
  draftId: AnnouncementDraftId,
): Promise<ApiAnnouncementDraft> {
  // pgw-web wraps single-detail responses as `body: [<detail>]`; unwrap.
  const bareId = draftId.replace(/^annDraft_/, '');
  const arr = await fetchApi<ApiAnnouncementDraft[]>(`/announcements/drafts/${bareId}`);
  return arr[0];
}

// ─── Write ──────────────────────────────────────────────────────────────────

/** Create and immediately send an announcement. */
export function createAnnouncement(payload: ApiCreateAnnouncementPayload) {
  return mutateApi<{ postId: number }>('POST', '/announcements', toPGCreatePayload(payload));
}

/** Save an announcement as draft. PGW allows partial data on drafts. */
export function createDraft(
  payload: ApiCreateDraftPayload,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<{ announcementDraftId: number }> {
  const body = {
    ...toPGCreatePayload(payload, { allowPartial: true }),
    scheduledSendAt: payload.scheduledSendAt,
  };
  return mutateApi('POST', '/announcements/drafts', body, options);
}

/**
 * Schedule a NEW announcement (single round-trip — creates the draft and
 * sets status=SCHEDULED). Same body shape as `createDraft` plus a required
 * `scheduledDateTime`. PGW's plain `/drafts` endpoint never flips a draft
 * to SCHEDULED, so anything intended for future send must go through here.
 */
export function scheduleNewAnnouncementDraft(
  payload: ApiCreateDraftPayload & { scheduledSendAt: string },
  options: { signal?: AbortSignal } = {},
): Promise<{ announcementDraftId: number; updatedAt: string }> {
  const body = {
    ...toPGCreatePayload(payload),
    scheduledDateTime: payload.scheduledSendAt,
  };
  return mutateApi('POST', '/announcements/drafts/schedule', body, options);
}

/**
 * Schedule an EXISTING announcement draft. PGW: PUT `/drafts/schedule/:id`
 * with the full draft payload + `scheduledDateTime`. Distinct from `updateDraft`
 * — only this endpoint flips status from DRAFT → SCHEDULED.
 */
export function scheduleExistingAnnouncementDraft(
  draftId: number,
  payload: ApiCreateDraftPayload & { scheduledSendAt: string },
  options: { signal?: AbortSignal } = {},
): Promise<{ announcementDraftId: number; updatedAt: string }> {
  const body = {
    ...toPGCreatePayload(payload),
    scheduledDateTime: payload.scheduledSendAt,
  };
  return mutateApi('PUT', `/announcements/drafts/schedule/${draftId}`, body, options);
}

/**
 * Reschedule an already-scheduled announcement draft (U3). Distinct from
 * `updateDraft` — PGW exposes a dedicated endpoint so reschedule-in-window
 * races don't collide with generic field updates. Body field name (`scheduledDateTime`)
 * differs from the create-draft scheduling field (`scheduledSendAt`); both
 * carry an ISO 8601 timestamp in SGT.
 */
export function rescheduleAnnouncementDraft(
  draftId: number,
  payload: { scheduledSendAt: string },
  options: { signal?: AbortSignal } = {},
) {
  return mutateApi<void>(
    'PUT',
    `/announcements/drafts/${draftId}/rescheduleSchedule`,
    { scheduledDateTime: payload.scheduledSendAt },
    options,
  );
}

/**
 * Cancel a scheduled announcement draft (U9). Leaves the draft intact — the
 * post returns to DRAFT so the user can edit and reschedule.
 */
export function cancelAnnouncementSchedule(
  draftId: number,
  options: { signal?: AbortSignal } = {},
) {
  return mutateApi<void>('POST', `/announcements/drafts/${draftId}/cancelSchedule`, {}, options);
}

/** Update an existing draft. PGW allows partial data on drafts. */
export function updateDraft(
  draftId: number,
  payload: ApiCreateDraftPayload,
  options: { signal?: AbortSignal } = {},
): Promise<void> {
  const body = {
    ...toPGCreatePayload(payload, { allowPartial: true }),
    scheduledSendAt: payload.scheduledSendAt,
  };
  return mutateApi('PUT', `/announcements/drafts/${draftId}`, body, options);
}

/** Duplicate a posted announcement. PGW returns the new draft id. */
export function duplicateAnnouncement(announcementId: number) {
  return mutateApi<ApiDuplicateAnnouncementResponse>('POST', '/announcements/duplicate', {
    announcementId,
  });
}

/** Duplicate an existing announcement draft. PGW returns the new draft id. */
export function duplicateAnnouncementDraft(announcementDraftId: number) {
  return mutateApi<ApiDuplicateAnnouncementResponse>('POST', '/announcements/drafts/duplicate', {
    announcementDraftId,
  });
}

/** Update enquiry email on a posted announcement. */
export function updateAnnouncementEnquiryEmail(
  postId: AnnouncementId,
  payload: { enquiryEmailAddress: string },
) {
  return mutateApi<void>('PUT', `/announcements/${postId}/enquiryEmailAddress`, payload);
}

/** Replace staff-in-charge on a posted announcement. */
export function updateAnnouncementStaffInCharge(
  postId: AnnouncementId,
  staffIds: number[],
): Promise<void> {
  const staffGroups: ApiGroupTarget[] = staffIds.map((id) => ({
    type: 'individual',
    label: '',
    value: id,
  }));
  return mutateApi('POST', `/announcements/${postId}/addStaffInCharge`, { staffGroups });
}

/** Delete a posted announcement. */
export function deleteAnnouncement(postId: AnnouncementId) {
  return deleteApi(`/announcements/${postId}`);
}

/** Delete a draft announcement. */
export function deleteDraft(draftId: number) {
  return deleteApi(`/announcements/drafts/${draftId}`);
}

// ─── Composed loaders ───────────────────────────────────────────────────────

export async function loadPostsList(): Promise<AnnouncementPost[]> {
  const [own, shared] = await Promise.all([fetchAnnouncements(), fetchSharedAnnouncements()]);
  const mappedOwn = own.map((p) => mapAnnouncementSummary(p, 'mine'));
  const mappedShared = shared.map((p) => mapAnnouncementSummary(p, 'shared'));
  return mergeAndDedup(mappedOwn, mappedShared);
}

export async function loadPostDetail(postId: AnnouncementId): Promise<AnnouncementPost> {
  const detail = await fetchAnnouncementDetail(postId);
  return mapAnnouncementDetail(detail);
}

export async function loadAnnouncementDraftDetail(
  draftId: AnnouncementDraftId,
): Promise<AnnouncementPost> {
  const detail = await fetchAnnouncementDraftDetail(draftId);
  return mapAnnouncementDraftDetail(detail);
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSENT FORMS
// ═══════════════════════════════════════════════════════════════════════════

// ─── Read ───────────────────────────────────────────────────────────────────

function fetchConsentForms() {
  return fetchApi<ApiConsentFormList>('/consentForms');
}

function fetchSharedConsentForms() {
  return fetchApi<ApiConsentFormList>('/consentForms/shared');
}

export async function fetchConsentFormDetail(formId: ConsentFormId): Promise<ApiConsentFormDetail> {
  // pgw strips the `cf_` prefix when addressing the detail endpoint. The
  // response shape is `body: [<detail>]` (single-element array) — unwrap.
  const numericId = formId.slice(3);
  const arr = await fetchApi<ApiConsentFormDetail[]>(`/consentForms/${numericId}`);
  return arr[0];
}

// ─── Write ──────────────────────────────────────────────────────────────────

/** Create and immediately send a consent form. */
export function createConsentForm(payload: ApiCreateConsentFormPayload) {
  return mutateApi<{ consentFormId: number }>(
    'POST',
    '/consentForms',
    toPGConsentFormCreatePayload(payload),
  );
}

/** Save a consent form as draft (optionally with a scheduled send-at). */
export function createConsentFormDraft(
  payload: ApiCreateConsentFormDraftPayload,
  options: { signal?: AbortSignal } = {},
) {
  return mutateApi<{ consentFormDraftId: number }>(
    'POST',
    '/consentForms/drafts',
    toPGConsentFormDraftPayload(payload),
    options,
  );
}

/** Update an existing consent-form draft. */
export function updateConsentFormDraft(
  draftId: number,
  payload: ApiCreateConsentFormDraftPayload,
  options: { signal?: AbortSignal } = {},
) {
  return mutateApi<void>(
    'PUT',
    `/consentForms/drafts/${draftId}`,
    toPGConsentFormDraftPayload(payload),
    options,
  );
}

export function updateConsentFormDueDate(formId: number, payload: { consentByDate: string }) {
  return mutateApi<void>('PUT', `/consentForms/${formId}/updateDueDate`, payload);
}

/**
 * Schedule a NEW consent form (single round-trip — creates the draft and sets
 * status=SCHEDULED). Same body shape as `createConsentFormDraft` plus a
 * required `scheduledDateTime`. Mirrors `scheduleNewAnnouncementDraft`.
 */
export function scheduleNewConsentFormDraft(
  payload: ApiCreateConsentFormDraftPayload & { scheduledSendAt: string },
  options: { signal?: AbortSignal } = {},
): Promise<{ consentFormDraftId: number; updatedAt: string }> {
  const body = {
    ...toPGConsentFormDraftPayload(payload),
    scheduledDateTime: payload.scheduledSendAt,
  };
  return mutateApi('POST', '/consentForms/drafts/schedule', body, options);
}

/**
 * Schedule an EXISTING consent-form draft. PGW: PUT `/drafts/schedule/:id`
 * with the full draft payload + `scheduledDateTime`. Distinct from
 * `updateConsentFormDraft` — only this endpoint flips status to SCHEDULED.
 */
export function scheduleExistingConsentFormDraft(
  draftId: number,
  payload: ApiCreateConsentFormDraftPayload & { scheduledSendAt: string },
  options: { signal?: AbortSignal } = {},
): Promise<{ consentFormDraftId: number; updatedAt: string }> {
  const body = {
    ...toPGConsentFormDraftPayload(payload),
    scheduledDateTime: payload.scheduledSendAt,
  };
  return mutateApi('PUT', `/consentForms/drafts/schedule/${draftId}`, body, options);
}

/**
 * Reschedule an already-scheduled consent-form draft (U3). Mirrors
 * `rescheduleAnnouncementDraft`; PGW keeps these as two endpoint families,
 * so containers pick the right helper by the post's `kind`.
 */
export function rescheduleConsentFormDraft(
  draftId: number,
  payload: { scheduledSendAt: string },
  options: { signal?: AbortSignal } = {},
) {
  return mutateApi<void>(
    'PUT',
    `/consentForms/drafts/${draftId}/rescheduleSchedule`,
    { scheduledDateTime: payload.scheduledSendAt },
    options,
  );
}

/** Cancel a scheduled consent-form draft (U9). Mirrors `cancelAnnouncementSchedule`. */
export function cancelConsentFormSchedule(draftId: number, options: { signal?: AbortSignal } = {}) {
  return mutateApi<void>('POST', `/consentForms/drafts/${draftId}/cancelSchedule`, {}, options);
}

/** Duplicate a posted consent form. PGW returns the new draft id. */
export function duplicateConsentForm(consentFormId: number) {
  return mutateApi<ApiDuplicateConsentFormResponse>('POST', '/consentForms/duplicate', {
    consentFormId,
  });
}

/** Duplicate an existing consent-form draft. PGW returns the new draft id. */
export function duplicateConsentFormDraft(consentFormDraftId: number) {
  return mutateApi<ApiDuplicateConsentFormResponse>('POST', '/consentForms/drafts/duplicate', {
    consentFormDraftId,
  });
}

export function deleteConsentForm(formId: ConsentFormId) {
  const numericId = formId.slice(3);
  return deleteApi(`/consentForms/${numericId}`);
}

export function deleteConsentFormDraft(draftId: number) {
  return deleteApi(`/consentForms/drafts/${draftId}`);
}

/** Update enquiry email on a posted consent form. */
export function updateConsentFormEnquiryEmail(
  formId: ConsentFormId,
  payload: { enquiryEmailAddress: string },
) {
  const numericId = formId.slice(3);
  return mutateApi<void>('PUT', `/consentForms/${numericId}/updateEnquiryEmail`, payload);
}

/** Replace staff-in-charge on a posted consent form. */
export function updateConsentFormStaffInCharge(
  formId: ConsentFormId,
  staffIds: number[],
): Promise<void> {
  const numericId = formId.slice(3);
  const staffGroups: ApiGroupTarget[] = staffIds.map((id) => ({
    type: 'individual',
    label: '',
    value: id,
  }));
  return mutateApi('POST', `/consentForms/${numericId}/addStaffInCharge`, { staffGroups });
}

// ─── Composed loaders ───────────────────────────────────────────────────────

/** Consent-form list loader that returns the unified `ConsentFormPost[]` shape. */
export async function loadConsentPostsList(): Promise<ConsentFormPost[]> {
  const [own, shared] = await Promise.all([fetchConsentForms(), fetchSharedConsentForms()]);
  const mappedOwn = own.map((p) => mapConsentFormSummaryToPost(p, 'mine'));
  const mappedShared = shared.map((p) => mapConsentFormSummaryToPost(p, 'shared'));
  return mergeAndDedup(mappedOwn, mappedShared);
}

/** Consent-form detail loader that returns the unified `ConsentFormPost` shape. */
export async function loadConsentPostDetail(formId: ConsentFormId): Promise<ConsentFormPost> {
  const detail = await fetchConsentFormDetail(formId);
  return mapConsentFormDetail(detail);
}

async function fetchConsentFormDraftDetail(
  draftId: ConsentFormDraftId,
): Promise<ApiConsentFormDraft> {
  // Strip the `cfDraft_` prefix to get the bare numeric ID.
  const bareId = draftId.replace(/^cfDraft_/, '');
  // pgw-web wraps single-detail responses as `body: [<detail>]`; unwrap.
  const arr = await fetchApi<ApiConsentFormDraft[]>(`/consentForms/drafts/${bareId}`);
  return arr[0];
}

export async function loadConsentFormDraftDetail(
  draftId: ConsentFormDraftId,
): Promise<ConsentFormPost> {
  const draft = await fetchConsentFormDraftDetail(draftId);
  return mapConsentFormDraftDetail(draft);
}

// ═══════════════════════════════════════════════════════════════════════════
// SCHOOL DATA (for selectors and forms)
// ═══════════════════════════════════════════════════════════════════════════

export function fetchSchoolStaff() {
  return fetchApi<ApiSchoolStaffList>('/school/staff');
}

// Real pgw-web returns `body.class` (singular) as an array of ApiSchoolClass.
// Use this helper when a UI needs just the classes for a selector.
export async function fetchSchoolClasses() {
  const data = await fetchApi<{ class: ApiSchoolClass[] }>('/school/groups');
  return data.class ?? [];
}

export function fetchSchoolStudents() {
  return fetchApi<ApiSchoolStudent[]>('/school/students');
}

export function fetchSchoolStaffGroups() {
  return fetchApi<ApiStaffGroups>('/school/staffGroups');
}

export function fetchGroupsAssigned() {
  return fetchApi<ApiGroupsAssigned>('/groups/assigned');
}

/**
 * Real PGW returns `body` as a bare array of groups in a different field
 * vocabulary than our internal type (`id` not `customGroupId`, `groupName`
 * not `name`, no `studentCount` — derived from `studentsList`, `createdBy`
 * is a staff name string, etc.). The BFF mock fixture mirrors this raw
 * shape so both proxy and mock modes flow through the same mapper.
 */
interface PgwRawCustomGroup {
  id: number;
  groupName: string;
  createdBy: string;
  createdAt: string;
  owners?: { staffId: number; staffName: string }[];
  studentsList?: unknown[];
}

function mapPgwCustomGroup(raw: PgwRawCustomGroup): ApiCustomGroupSummary {
  return {
    customGroupId: raw.id,
    name: raw.groupName,
    studentCount: raw.studentsList?.length ?? 0,
    // Real PGW returns only the creator's display name in this list
    // payload — no numeric staffId. Surface 0 as a sentinel so callers
    // can detect "unknown" if they need ownership checks.
    createdBy: raw.owners?.[0]?.staffId ?? 0,
    createdByName: raw.createdBy,
    isShared: (raw.owners?.length ?? 0) > 1,
    createdAt: raw.createdAt,
  };
}

export async function fetchCustomGroups(): Promise<ApiCustomGroupsList> {
  const raw = await fetchApi<PgwRawCustomGroup[]>('/groups/custom');
  // Guard: real PGW returns a bare array; be defensive in case the shape differs.
  const list = Array.isArray(raw) ? raw : [];
  return { customGroups: list.map(mapPgwCustomGroup) };
}

interface PgwRawCustomGroupDetail {
  id: number;
  groupName: string;
  createdBy: string;
  createdAt: string;
  owners?: { staffId: number; staffName: string }[];
  studentsList?: {
    studentId: number;
    studentName: string;
    className: string;
    indexNumber?: number;
    uinFinNo?: string;
    ccas?: string[];
  }[];
}

function mapPgwCustomGroupDetail(raw: PgwRawCustomGroupDetail): ApiCustomGroupDetail {
  const owners = raw.owners ?? [];
  const creator = owners[0];
  return {
    customGroupId: raw.id,
    name: raw.groupName,
    createdBy: creator?.staffId ?? 0,
    createdByName: raw.createdBy,
    isShared: owners.length > 1,
    sharedWith: owners.slice(1),
    students: (raw.studentsList ?? []).map((s) => ({
      studentId: s.studentId,
      studentName: s.studentName,
      className: s.className,
      indexNumber: s.indexNumber,
      uinFinNo: s.uinFinNo,
      ccas: s.ccas,
    })),
    createdAt: raw.createdAt,
  };
}

export async function fetchCustomGroupDetail(id: number): Promise<ApiCustomGroupDetail> {
  // Real PGW returns `body` as a single-element array even for detail
  // endpoints (matches the list shape). The mock fixture mirrors this.
  const raw = await fetchApi<PgwRawCustomGroupDetail | PgwRawCustomGroupDetail[]>(
    `/groups/custom/${id}`,
  );
  const item = Array.isArray(raw) ? raw[0] : raw;
  if (!item) {
    throw new Response('Group not found', { status: 404 });
  }
  if (Array.isArray(raw) && raw.length > 1) {
    // eslint-disable-next-line no-console -- intentional diagnostic for unexpected PGW shape
    console.warn('fetchCustomGroupDetail: expected 1 element, got %d', raw.length);
  }
  return mapPgwCustomGroupDetail(item);
}

export async function createCustomGroup(payload: {
  name: string;
  studentIds: number[];
}): Promise<ApiCreateCustomGroupResponse> {
  // Real PGW field names diverge from the contract doc:
  //   - request: `groupName` (not `name`), `selectedSchoolStudents` (not `studentIds`)
  //   - response: `id` (not `customGroupId`)
  // Confirmed via -400 responses + smoke testing during PGTW-13c.
  const raw = await mutateApi<{ id: number; customGroupId?: number }>('POST', '/groups/custom', {
    groupName: payload.name,
    selectedSchoolStudents: payload.studentIds,
  });
  return { customGroupId: raw.customGroupId ?? raw.id };
}

export async function updateCustomGroup(
  id: number,
  payload: { name: string; studentIds: number[] },
): Promise<void> {
  await mutateApi<void>('PUT', `/groups/custom/${id}`, {
    groupName: payload.name,
    selectedSchoolStudents: payload.studentIds,
  });
}

export async function shareCustomGroup(id: number, staffIds: number[]): Promise<void> {
  await mutateApi<void>('PUT', `/groups/custom/${id}/share`, {
    selectedStaff: staffIds,
  });
}

export async function removeAccessFromCustomGroup(id: number): Promise<void> {
  await mutateApi<void>('PUT', `/groups/custom/${id}/removeAccess`, {});
}

export function deleteCustomGroup(id: number) {
  return deleteApi(`/groups/custom/${id}`);
}

export function fetchClassDetail(classId: number) {
  return fetchApi<ApiClassDetail>(`/groups/classes/${classId}`);
}

export function fetchCcaDetail(ccaId: number) {
  return fetchApi<ApiCcaDetail>(`/groups/ccas/${ccaId}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// SESSION & ACCOUNT
// ═══════════════════════════════════════════════════════════════════════════

export function fetchSession() {
  return fetchApi<ApiSession>('/session/current');
}

export function fetchUserProfile() {
  return fetchApi<ApiUserProfile>('/users/me');
}

export function updateDisplayName(staffId: number, displayName: string) {
  return mutateApi<void>('PUT', `/${staffId}/updateDisplayName`, { displayName });
}

export function updateDisplayEmail(staffId: number, displayEmail: string) {
  return mutateApi<void>('PUT', `/${staffId}/updateDisplayEmail`, { displayEmail });
}

// ═══════════════════════════════════════════════════════════════════════════
// FILE ATTACHMENTS
//
// PG's documented 3-step upload flow (docs/references/pg-api-contract.md
// §1231-1278). Mocked locally via `server/internal/pg/mock.go` —
// `registerMockFiles` points `presignedUrl` at a local `/api/files/2/mockUpload`
// route that just 204s, so the client exercises all three legs without an
// actual S3 roundtrip. When pgw-web implements the real endpoints, the
// client code is unchanged — see TODO in
// `docs/plans/2026-04-23-001-feat-file-attachments-plan.md`.
// ═══════════════════════════════════════════════════════════════════════════

export type AttachmentUploadType = 'ANNOUNCEMENT' | 'CONSENT_FORM';

export interface PreUploadResponse {
  attachmentId: number;
  presignedUrl: string;
  fields: Record<string, string>;
}

/**
 * Step 1 — POST file + metadata to `preUploadValidation`. Returns the
 * attachment ID and the presigned URL the client should POST the raw file
 * to next. `type` tags which domain this upload belongs to so PG can enforce
 * per-domain quotas and MIME policies.
 */
export function validateAttachmentUpload(
  file: File,
  type: AttachmentUploadType,
): Promise<PreUploadResponse> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('type', type);
  fd.append('mimeType', file.type);
  fd.append('fileSize', String(file.size));
  return postMultipart<PreUploadResponse>('/files/2/preUploadValidation', fd);
}

/**
 * Step 2 — POST the file to the presigned URL. The AWS POST policy requires
 * `fields` to be serialized before `file` in the multipart body, so the
 * order here is load-bearing — do not reorder.
 */
export async function uploadToPresignedUrl(
  presignedUrl: string,
  fields: Record<string, string>,
  file: File,
): Promise<void> {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  fd.append('file', file);
  const res = await fetch(presignedUrl, { method: 'POST', body: fd });
  if (!res.ok) throw new Error(`S3 upload failed: ${res.status}`);
}

/**
 * Step 3 — poll `postUploadVerification` until the AV scan reports verified.
 * The mock always returns `{verified:true}` instantly; real PG scans take
 * variable time, so we poll with a small delay and cap the total wait.
 * Exact backoff tuning lives in the plan's Real-PGW TODO.
 */
export async function verifyAttachmentUpload(
  attachmentId: number,
  { timeoutMs = 30_000, intervalMs = 500 }: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<{ verified: boolean }> {
  const deadline = Date.now() + timeoutMs;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await fetch(`/api/files/2/postUploadVerification?attachmentId=${attachmentId}`, {
      credentials: 'include',
    });
    if (!res.ok) await handleErrorResponse(res);
    const text = await res.text();
    const body = text ? (unwrapEnvelope(JSON.parse(text)) as { verified?: boolean }) : {};
    if (body.verified === true) return { verified: true };
    if (Date.now() >= deadline) throw new Error('Scan timed out.');
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

export type UploadStage = 'uploading' | 'verifying' | 'ready';

/**
 * Composes the three steps behind a single call. Emits stage transitions via
 * `onProgress` so callers (the AttachmentSection hook) can dispatch reducer
 * updates. Resolves with the server-issued identifiers needed for the post
 * payload; rejects on any leg failing so the caller can flip the UI row to
 * `error`.
 */
export async function uploadAttachment(
  file: File,
  type: AttachmentUploadType,
  onProgress?: (stage: UploadStage) => void,
): Promise<{ attachmentId: number; url: string }> {
  onProgress?.('uploading');
  const pre = await validateAttachmentUpload(file, type);
  await uploadToPresignedUrl(pre.presignedUrl, pre.fields, file);
  onProgress?.('verifying');
  await verifyAttachmentUpload(pre.attachmentId);
  // NOTE: do NOT emit `onProgress('ready')` here. The caller's `.then`
  // dispatches the atomic `{status:'ready', attachmentId, url, thumbnailUrl}`
  // patch — emitting an early `ready` would leave a one-microtask window
  // where a photo renders without its `thumbnailUrl`.
  // The real PG write payload needs the S3 location PG resolves via
  // `handleDownloadAttachment`. Mock doesn't return one, so synthesize a
  // stable URL pointing at the download endpoint — keeps the wire payload
  // shape-correct even against the mock.
  const url = `/api/files/2/handleDownloadAttachment?attachmentId=${pre.attachmentId}`;
  return { attachmentId: pre.attachmentId, url };
}
