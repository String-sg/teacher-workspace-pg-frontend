import type {
  FormQuestion,
  PostEvent,
  ReminderConfig,
  ResponseType,
  WebsiteLink,
} from '~/data/posts-registry';

export interface SelectedEntity {
  id: string | number;
  label: string;
  type: string;
  count?: number;
}

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
