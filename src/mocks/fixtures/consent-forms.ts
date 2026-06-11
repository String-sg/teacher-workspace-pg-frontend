import type { ApiConsentFormDetail, ApiConsentFormSummary } from '~/features/posts/api/types';

export const consentFormsList: ApiConsentFormSummary[] = [
  {
    id: 'cf-1',
    postId: 401,
    title: 'Science Museum Learning Journey',
    date: '2026-06-09T09:00:00+08:00',
    status: 'OPEN',
    toParentsOf: ['4A', '4B'],
    respondedMetrics: { respondedPerStudent: 0.6, totalStudents: 60 },
    scheduledSendFailureCode: null,
    createdByName: 'Mr Lim Kah Hoe',
    consentByDate: '2026-06-18',
    eventStartDate: '2026-06-25T08:00:00+08:00',
    eventEndDate: '2026-06-25T14:00:00+08:00',
    eventReminderDate: '2026-06-16',
  },
  {
    id: 'cf-2',
    postId: 402,
    title: 'Swimming Lessons Term 3',
    date: '2026-06-07T11:00:00+08:00',
    status: 'OPEN',
    toParentsOf: ['5A', '5B', '5C'],
    respondedMetrics: { respondedPerStudent: 0.85, totalStudents: 90 },
    scheduledSendFailureCode: null,
    createdByName: 'Ms Tan Wei Ling',
    consentByDate: '2026-06-20',
    eventStartDate: '2026-07-01T08:00:00+08:00',
    eventEndDate: '2026-07-01T10:00:00+08:00',
    eventReminderDate: null,
  },
  {
    id: 'cf-3',
    postId: 501,
    title: 'Photography Club Outdoor Shoot',
    date: '2026-06-12T15:00:00+08:00',
    status: 'DRAFT',
    toParentsOf: [],
    respondedMetrics: { respondedPerStudent: 0, totalStudents: 0 },
    scheduledSendFailureCode: null,
    createdByName: 'Mr Lim Kah Hoe',
    consentByDate: null,
    eventStartDate: null,
    eventEndDate: null,
    eventReminderDate: null,
  },
];

export const consentFormDetail: ApiConsentFormDetail = {
  consentFormId: 401,
  title: 'Science Museum Learning Journey',
  content: null,
  richTextContent: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Dear Parents/Guardians,',
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'We are organising a learning journey to the Science Centre Singapore for all Primary 4 students. Please indicate your consent for your child to participate.',
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            marks: [{ type: 'bold' }],
            text: 'Trip Details:',
          },
        ],
      },
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [
              { type: 'paragraph', content: [{ type: 'text', text: 'Date: Wednesday, 25 June 2026' }] },
            ],
          },
          {
            type: 'listItem',
            content: [
              { type: 'paragraph', content: [{ type: 'text', text: 'Time: 8:00 AM - 2:00 PM' }] },
            ],
          },
          {
            type: 'listItem',
            content: [
              { type: 'paragraph', content: [{ type: 'text', text: 'Cost: $5.00 (subsidised)' }] },
            ],
          },
        ],
      },
    ],
  },
  responseType: 'YES_NO',
  eventStartDate: '2026-06-25T08:00:00+08:00',
  eventEndDate: '2026-06-25T14:00:00+08:00',
  consentByDate: '2026-06-18',
  addReminderType: 'ONE_TIME',
  reminderDate: '2026-06-16',
  postedDate: '2026-06-09T09:00:00+08:00',
  venue: 'Science Centre Singapore',
  enquiryEmailAddress: 'p4_science@greendale.edu.sg',
  staffName: 'Mr Lim Kah Hoe',
  createdBy: 1002,
  createdAt: '2026-06-08T16:00:00+08:00',
  images: [],
  attachments: [
    { attachmentId: 601, name: 'Trip_Itinerary.pdf', size: 180000, url: '#' },
    { attachmentId: 602, name: 'Emergency_Contact_Form.pdf', size: 95000, url: '#' },
  ],
  webLinkList: [
    { title: 'Science Centre Website', url: 'https://www.science.edu.sg' },
  ],
  shortcutLinkList: [],
  customQuestions: [
    { questionId: 1, type: 'FREE_TEXT', text: 'Does your child have any food allergies?' },
    { questionId: 2, type: 'MCQ', text: 'Preferred lunch option', options: ['Chicken Rice', 'Nasi Lemak', 'Vegetarian'] },
  ],
  staffOwners: [
    { staffID: 1002, staffName: 'Mr Lim Kah Hoe' },
    { staffID: 1003, staffName: 'Ms Wong Siew Mei' },
  ],
  consentFormRecipients: [
    {
      studentId: 3001,
      reply: 'YES',
      replyDate: '2026-06-10T09:30:00+08:00',
      replyByParent: 'Mrs Ibrahim',
      parentType: 'Mother',
      contactNumber: '91234567',
      remarks: null,
      isIndividual: false,
      onBoardedCategory: 'ONBOARDED',
      student: { studentId: 3001, studentName: 'Ahmad bin Ibrahim', className: '4A', indexNumber: '01' },
    },
    {
      studentId: 3002,
      reply: 'NO',
      replyDate: '2026-06-10T14:00:00+08:00',
      replyByParent: 'Mr Chen',
      parentType: 'Father',
      contactNumber: '98765432',
      remarks: 'Family event on that day',
      isIndividual: false,
      onBoardedCategory: 'ONBOARDED',
      student: { studentId: 3002, studentName: 'Chen Wei Jie', className: '4A', indexNumber: '05' },
    },
    {
      studentId: 3003,
      reply: null,
      replyDate: null,
      replyByParent: null,
      parentType: null,
      contactNumber: null,
      remarks: null,
      isIndividual: false,
      onBoardedCategory: 'ONBOARDED',
      student: { studentId: 3003, studentName: 'Priya Nair', className: '4B', indexNumber: '12' },
    },
  ],
  consentFormHistory: [
    { historyId: 1, action: 'CREATED', actionAt: '2026-06-08T16:00:00+08:00', actionBy: 'Mr Lim Kah Hoe' },
    { historyId: 2, action: 'POSTED', actionAt: '2026-06-09T09:00:00+08:00', actionBy: 'Mr Lim Kah Hoe' },
  ],
  targets: [
    {
      announcementId: 401,
      announcementTargetId: 10,
      createdAt: '2026-06-08T16:00:00+08:00',
      isDeleted: false,
      targetAcadYear: 2026,
      targetId: 401,
      targetName: '4A',
      targetSchool: 'Greendale Primary',
      targetType: 'class',
      updatedAt: '2026-06-08T16:00:00+08:00',
    },
    {
      announcementId: 401,
      announcementTargetId: 11,
      createdAt: '2026-06-08T16:00:00+08:00',
      isDeleted: false,
      targetAcadYear: 2026,
      targetId: 402,
      targetName: '4B',
      targetSchool: 'Greendale Primary',
      targetType: 'class',
      updatedAt: '2026-06-08T16:00:00+08:00',
    },
  ],
};
