import type { FormQuestion, PostEvent, ReminderConfig, ResponseType } from '~/data/posts-registry';

import type { SelectedEntity, UploadingFile } from './initial-state';

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
