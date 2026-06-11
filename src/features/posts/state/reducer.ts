import type { FormQuestion } from '~/data/posts-registry';

import type { PostFormAction } from './actions';
import type { PostFormState, UploadingFile } from './initial-state';

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
