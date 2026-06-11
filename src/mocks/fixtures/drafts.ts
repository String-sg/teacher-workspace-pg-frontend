import type { ApiAnnouncementDraft, ApiAnnouncementTarget, ApiConsentFormDraft } from '~/features/posts/api/types';

const targets: ApiAnnouncementTarget[] = [
  {
    announcementId: 501,
    announcementTargetId: 20,
    createdAt: '2026-06-12T15:00:00+08:00',
    isDeleted: false,
    targetAcadYear: 2026,
    targetId: 401,
    targetName: '4A',
    targetSchool: 'Greendale Primary',
    targetType: 'class',
    updatedAt: '2026-06-12T15:00:00+08:00',
  },
  {
    announcementId: 501,
    announcementTargetId: 21,
    createdAt: '2026-06-12T15:00:00+08:00',
    isDeleted: false,
    targetAcadYear: 2026,
    targetId: 402,
    targetName: '4B',
    targetSchool: 'Greendale Primary',
    targetType: 'class',
    updatedAt: '2026-06-12T15:00:00+08:00',
  },
];

export const consentFormDraft: ApiConsentFormDraft = {
  consentFormDraftId: 501,
  status: 'DRAFT',
  postedConsentFormId: null,
  title: 'Photography Club Outdoor Shoot',
  content: null,
  richTextContent: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Dear Parents/Guardians,' }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'The Photography Club will be organising an outdoor photography session at Botanic Gardens. Please provide consent for your child to participate.',
          },
        ],
      },
    ],
  },
  venue: 'Singapore Botanic Gardens',
  eventStartDate: { date: '2026-07-05', time: '08:00' },
  eventEndDate: { date: '2026-07-05', time: '12:00' },
  reminderDate: '2026-06-30',
  addReminderType: 'ONE_TIME',
  enquiryEmailAddress: 'photography_club@greendale.edu.sg',
  consentByDate: '2026-07-01',
  responseType: 'YES_NO',
  customQuestions: [
    { questionId: 1, type: 'FREE_TEXT', text: 'Does your child have their own camera?' },
  ],
  staffGroups: [],
  studentGroups: [
    { type: 'class', label: '4A', value: 401 },
    { type: 'class', label: '4B', value: 402 },
  ],
  staffOwners: [{ staffID: 1002, staffName: 'Mr Lim Kah Hoe' }],
  targets,
  images: { images: [], imagesOrigin: '' },
  attachments: [],
  urls: [],
  shortcuts: [],
  updatedAt: '2026-06-12T15:00:00+08:00',
  scheduledDateTime: null,
};

export const announcementDraft: ApiAnnouncementDraft = {
  announcementDraftId: 301,
  status: 'DRAFT',
  postedAnnouncementId: null,
  title: 'Parent-Teacher Conference Slots',
  content: null,
  richTextContent: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Dear Parents/Guardians,' }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Parent-Teacher Conference will be held on 25 June 2026. Please select your preferred time slot.',
          },
        ],
      },
    ],
  },
  enquiryEmailAddress: 'general_office@greendale.edu.sg',
  staffGroups: [],
  studentGroups: [
    { type: 'class', label: '3A', value: 301 },
  ],
  images: { images: [], imagesOrigin: '' },
  attachments: [],
  urls: [],
  shortcuts: [],
  updatedAt: '2026-06-05T14:00:00+08:00',
  scheduledDateTime: null,
  scheduledSendFailureCode: null,
};
