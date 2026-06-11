import { describe, it, expect } from 'vitest';

import { INITIAL_STATE } from '../state/initial-state';
import type { PostFormState } from '../state/initial-state';
import {
  isCreatePostFormValid,
  computeInlineErrors,
  hasPendingUploads,
} from './create-post-validation';

const VALID_STATE: PostFormState = {
  ...INITIAL_STATE,
  title: 'Test Post',
  description: 'A description that is not empty',
  enquiryEmail: 'teacher@school.edu.sg',
  selectedRecipients: [{ id: '1', label: 'Class 1A', type: 'class' }],
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
