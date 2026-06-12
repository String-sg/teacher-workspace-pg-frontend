import type { ApiAnnouncementDetail, ApiAnnouncementSummary } from '~/features/posts/api/types';

export const announcementsList: ApiAnnouncementSummary[] = [
  {
    id: 'ann-1',
    postId: 101,
    title: 'End-of-Year Concert Reminder',
    date: '2026-06-10T08:00:00+08:00',
    status: 'POSTED',
    responseType: 'VIEW_ONLY',
    toParentsOf: ['3A', '3B', '3C'],
    readMetrics: { readPerStudent: 0.58, totalStudents: 12 },
    scheduledSendFailureCode: null,
    createdByName: 'Ms Tan Wei Ling',
  },
  {
    id: 'ann-2',
    postId: 102,
    title: 'Mid-Year Exam Schedule',
    date: '2026-06-08T10:30:00+08:00',
    status: 'POSTED',
    responseType: 'ACKNOWLEDGE',
    toParentsOf: ['4A', '4B'],
    readMetrics: { readPerStudent: 0.95, totalStudents: 60 },
    scheduledSendFailureCode: null,
    createdByName: 'Mr Lim Kah Hoe',
  },
  {
    id: 'ann-3',
    postId: 201,
    title: 'Sports Day Information',
    date: '2026-06-15T09:00:00+08:00',
    status: 'SCHEDULED',
    responseType: 'VIEW_ONLY',
    toParentsOf: ['All Levels'],
    readMetrics: undefined,
    scheduledSendFailureCode: null,
    createdByName: 'Ms Tan Wei Ling',
  },
  {
    id: 'ann-4',
    postId: 301,
    title: 'Parent-Teacher Conference Slots',
    date: '2026-06-05T14:00:00+08:00',
    status: 'DRAFT',
    responseType: 'YES_NO',
    toParentsOf: [],
    readMetrics: undefined,
    scheduledSendFailureCode: null,
    createdByName: 'Ms Tan Wei Ling',
  },
];

export const announcementDetail: ApiAnnouncementDetail = {
  announcementId: 101,
  title: 'End-of-Year Concert Reminder',
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
            text: 'We are pleased to remind you that the End-of-Year Concert will be held on Friday, 20 June 2026 at the school hall. Please ensure your child arrives by 5:30 PM for rehearsal.',
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            marks: [{ type: 'bold' }],
            text: 'Important details:',
          },
        ],
      },
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Date: Friday, 20 June 2026' }],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              { type: 'paragraph', content: [{ type: 'text', text: 'Time: 6:00 PM - 8:00 PM' }] },
            ],
          },
          {
            type: 'listItem',
            content: [
              { type: 'paragraph', content: [{ type: 'text', text: 'Venue: School Hall' }] },
            ],
          },
        ],
      },
    ],
  },
  responseType: 'VIEW_ONLY',
  staffName: 'Ms Tan Wei Ling',
  createdBy: 1001,
  createdAt: '2026-06-09T10:00:00+08:00',
  postedDate: '2026-06-10T08:00:00+08:00',
  enquiryEmailAddress: 'general_office@greendale.edu.sg',
  attachments: [{ attachmentId: 501, name: 'Concert_Programme.pdf', size: 245000, url: '#' }],
  images: [],
  shortcutLink: [],
  webLinkList: [],
  target: [
    {
      announcementId: 101,
      announcementTargetId: 1,
      createdAt: '2026-06-09T10:00:00+08:00',
      isDeleted: false,
      targetAcadYear: 2026,
      targetId: 301,
      targetName: '3A',
      targetSchool: 'Greendale Primary',
      targetType: 'class',
      updatedAt: '2026-06-09T10:00:00+08:00',
    },
    {
      announcementId: 101,
      announcementTargetId: 2,
      createdAt: '2026-06-09T10:00:00+08:00',
      isDeleted: false,
      targetAcadYear: 2026,
      targetId: 302,
      targetName: '3B',
      targetSchool: 'Greendale Primary',
      targetType: 'class',
      updatedAt: '2026-06-09T10:00:00+08:00',
    },
  ],
  staffOwners: [{ staffID: 1001, staffName: 'Ms Tan Wei Ling' }],
  students: [
    { studentId: 2001, studentName: 'Ahmad bin Ibrahim', className: '3A', readStatus: 'READ' },
    { studentId: 2002, studentName: 'Chen Mei Hua', className: '3A', readStatus: 'READ' },
    { studentId: 2003, studentName: 'Raj Kumar', className: '3B', readStatus: null },
    { studentId: 2004, studentName: 'Sarah Lim', className: '3B', readStatus: 'READ' },
    { studentId: 2005, studentName: 'Muhammad Hafiz', className: '3A', readStatus: null },
    { studentId: 2006, studentName: 'Nurul Aisyah', className: '3A', readStatus: 'READ' },
    { studentId: 2007, studentName: 'Tan Jun Wei', className: '3B', readStatus: null },
    { studentId: 2008, studentName: 'Kavitha Rajan', className: '3C', readStatus: 'READ' },
    { studentId: 2009, studentName: 'Wong Kai Xuan', className: '3C', readStatus: 'READ' },
    { studentId: 2010, studentName: 'Amir Syafiq', className: '3C', readStatus: null },
    { studentId: 2011, studentName: 'Jessica Ng', className: '3A', readStatus: 'READ' },
    { studentId: 2012, studentName: 'Ravi Chandran', className: '3B', readStatus: null },
  ],
  status: 'POSTED',
  scheduledSendAt: null,
  scheduledSendFailureCode: null,
};
