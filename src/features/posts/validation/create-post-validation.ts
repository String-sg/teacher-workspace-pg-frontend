import type { PostFormField } from '~/lib/validation-errors';

import type { PostFormState } from '../state/initial-state';

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
