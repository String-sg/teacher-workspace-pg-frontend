import { http, HttpResponse } from 'msw';

import { announcementDetail, announcementsList } from './fixtures/announcements';
import { consentFormDetail, consentFormsList } from './fixtures/consent-forms';
import { announcementDraft, consentFormDraft } from './fixtures/drafts';
import {
  customGroups,
  groupsAssigned,
  schoolClasses,
  schoolStaff,
  schoolStudents,
  staffGroups,
} from './fixtures/school-data';
import { configs, session } from './fixtures/session';

function envelope<T>(body: T) {
  return { body, resultCode: 1, message: 'OK' };
}

const BASE = '/api/web/2/staff';

export const handlers = [
  // ─── Announcements ──────────────────────────────────────────────────────────
  http.get(`${BASE}/announcements`, () => {
    return HttpResponse.json(envelope(announcementsList));
  }),

  http.get(`${BASE}/announcements/shared`, () => {
    return HttpResponse.json(envelope([]));
  }),

  http.get(`${BASE}/announcements/drafts/:draftId`, () => {
    return HttpResponse.json(envelope([announcementDraft]));
  }),

  http.get(`${BASE}/announcements/:postId`, () => {
    return HttpResponse.json(envelope([announcementDetail]));
  }),

  // ─── Consent Forms ──────────────────────────────────────────────────────────
  http.get(`${BASE}/consentForms`, () => {
    return HttpResponse.json(envelope(consentFormsList));
  }),

  http.get(`${BASE}/consentForms/shared`, () => {
    return HttpResponse.json(envelope([]));
  }),

  http.get(`${BASE}/consentForms/drafts/:draftId`, () => {
    return HttpResponse.json(envelope([consentFormDraft]));
  }),

  http.get(`${BASE}/consentForms/:formId`, () => {
    return HttpResponse.json(envelope([consentFormDetail]));
  }),

  // ─── School Data ────────────────────────────────────────────────────────────
  http.get(`${BASE}/school/groups`, () => {
    return HttpResponse.json(envelope({ class: schoolClasses }));
  }),

  http.get(`${BASE}/school/staff`, () => {
    return HttpResponse.json(envelope(schoolStaff));
  }),

  http.get(`${BASE}/school/staffGroups`, () => {
    return HttpResponse.json(envelope(staffGroups));
  }),

  http.get(`${BASE}/school/students`, () => {
    return HttpResponse.json(envelope(schoolStudents));
  }),

  http.get(`${BASE}/groups/assigned`, () => {
    return HttpResponse.json(envelope(groupsAssigned));
  }),

  http.get(`${BASE}/groups/custom`, () => {
    return HttpResponse.json(envelope(customGroups));
  }),

  http.get(`${BASE}/groups/custom/:id`, () => {
    return HttpResponse.json(
      envelope({
        id: 801,
        groupName: 'Science Olympiad Team',
        createdBy: 'Mr Lim Kah Hoe',
        createdAt: '2026-03-01T10:00:00+08:00',
        owners: [
          { staffId: 1002, staffName: 'Mr Lim Kah Hoe' },
          { staffId: 1001, staffName: 'Ms Tan Wei Ling' },
        ],
        studentsList: [
          { studentId: 2001, studentName: 'Ahmad bin Ibrahim', className: '3A', indexNumber: 1 },
          { studentId: 2002, studentName: 'Chen Mei Hua', className: '3A', indexNumber: 2 },
          { studentId: 2003, studentName: 'Raj Kumar', className: '3B', indexNumber: 1 },
          { studentId: 2004, studentName: 'Sarah Lim', className: '3B', indexNumber: 2 },
          { studentId: 3001, studentName: 'Ahmad bin Ibrahim Jr', className: '4A', indexNumber: 1 },
          { studentId: 3002, studentName: 'Chen Wei Jie', className: '4A', indexNumber: 5 },
          { studentId: 3003, studentName: 'Priya Nair', className: '4B', indexNumber: 12 },
          { studentId: 4001, studentName: 'Lim Zhi Hao', className: '5A', indexNumber: 3 },
          { studentId: 4002, studentName: 'Nurul Aisyah', className: '5A', indexNumber: 7 },
          { studentId: 4003, studentName: 'Tan Jia Wen', className: '5B', indexNumber: 2 },
          { studentId: 4004, studentName: 'Mohamed Irfan', className: '5B', indexNumber: 8 },
          { studentId: 4005, studentName: 'Chua Kai Xin', className: '5C', indexNumber: 4 },
        ],
      }),
    );
  }),

  http.get(`${BASE}/groups/classes/:classId`, () => {
    return HttpResponse.json(
      envelope({
        classId: 301,
        className: '3A',
        level: 'P3',
        year: 2026,
        students: [
          { studentId: 2001, studentName: 'Ahmad bin Ibrahim', admissionNumber: 'A001' },
          { studentId: 2002, studentName: 'Chen Mei Hua', admissionNumber: 'A002' },
        ],
      }),
    );
  }),

  // ─── Session & Config ───────────────────────────────────────────────────────
  http.get(`${BASE}/session/current`, () => {
    return HttpResponse.json(envelope(session));
  }),

  http.get(`${BASE}/users/me`, () => {
    return HttpResponse.json(
      envelope({
        staffId: 1001,
        staffName: 'Ms Tan Wei Ling',
        staffSchoolId: 1,
        email: 'tan_wei_ling@greendale.edu.sg',
        schoolEmail: 'general_office@greendale.edu.sg',
        schoolName: 'Greendale Primary School',
        displayName: 'Tan Wei Ling',
        displayEmail: 'tan_wei_ling@greendale.edu.sg',
      }),
    );
  }),

  http.get('/api/configs', () => {
    return HttpResponse.json(envelope(configs));
  }),

  http.get(`${BASE}/groups/ccas/:ccaId`, () => {
    return HttpResponse.json(
      envelope({
        ccaId: 701,
        ccaDescription: 'Football',
        students: [
          { studentId: 2001, studentName: 'Ahmad bin Ibrahim', className: '3A' },
          { studentId: 3001, studentName: 'Ahmad bin Ibrahim Jr', className: '4A' },
          { studentId: 3002, studentName: 'Chen Wei Jie', className: '4A' },
        ],
      }),
    );
  }),

  // ─── Groups Write Operations ────────────────────────────────────────────────
  http.post(`${BASE}/groups/custom`, () => {
    return HttpResponse.json(envelope({ customGroupId: 803 }));
  }),

  http.put(`${BASE}/groups/custom/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.put(`${BASE}/groups/custom/:id/share`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.put(`${BASE}/groups/custom/:id/removeAccess`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(`${BASE}/groups/custom/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${BASE}/groups/custom/validateStudents`, () => {
    return HttpResponse.json(envelope({ token: 'mock-validation-token-123' }));
  }),

  http.post(`${BASE}/groups/custom/validateStudents/results`, () => {
    return HttpResponse.json(
      envelope({
        status: 'success',
        data: {
          validStudents: [
            {
              pgStudentId: 2001,
              studentId: 'T1234567A',
              studentName: 'Ahmad bin Ibrahim',
              className: '3A',
              classCode: '3A',
              levelCode: 'P3',
              levelCodeDescription: 'Primary 3',
            },
          ],
          invalidStudents: [
            {
              name: 'Unknown Student',
              className: '9Z',
              message: 'Student not found in School Cockpit records.',
              row: 3,
            },
          ],
        },
        error: null,
      }),
    );
  }),

  // ─── Write Operations (stubs) ──────────────────────────────────────────────
  http.post(`${BASE}/announcements`, () => {
    return HttpResponse.json(envelope({ postId: 999 }));
  }),

  http.post(`${BASE}/announcements/drafts`, () => {
    return HttpResponse.json(envelope({ announcementDraftId: 888 }));
  }),

  http.put(`${BASE}/announcements/drafts/:draftId`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${BASE}/announcements/drafts/schedule`, () => {
    return HttpResponse.json(
      envelope({ announcementDraftId: 888, updatedAt: new Date().toISOString() }),
    );
  }),

  http.post(`${BASE}/announcements/duplicate`, () => {
    return HttpResponse.json(
      envelope({ announcementDraftId: 777, updatedAt: new Date().toISOString() }),
    );
  }),

  http.post(`${BASE}/announcements/drafts/duplicate`, () => {
    return HttpResponse.json(
      envelope({ announcementDraftId: 776, updatedAt: new Date().toISOString() }),
    );
  }),

  http.delete(`${BASE}/announcements/:postId`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(`${BASE}/announcements/drafts/:draftId`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${BASE}/consentForms`, () => {
    return HttpResponse.json(envelope({ consentFormId: 999 }));
  }),

  http.post(`${BASE}/consentForms/drafts`, () => {
    return HttpResponse.json(envelope({ consentFormDraftId: 888 }));
  }),

  http.put(`${BASE}/consentForms/drafts/:draftId`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${BASE}/consentForms/drafts/schedule`, () => {
    return HttpResponse.json(
      envelope({ consentFormDraftId: 888, updatedAt: new Date().toISOString() }),
    );
  }),

  http.post(`${BASE}/consentForms/duplicate`, () => {
    return HttpResponse.json(
      envelope({ consentFormDraftId: 777, updatedAt: new Date().toISOString() }),
    );
  }),

  http.post(`${BASE}/consentForms/drafts/duplicate`, () => {
    return HttpResponse.json(
      envelope({ consentFormDraftId: 776, updatedAt: new Date().toISOString() }),
    );
  }),

  http.delete(`${BASE}/consentForms/:formId`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(`${BASE}/consentForms/drafts/:draftId`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // ─── File Upload (stubs) ───────────────────────────────────────────────────
  http.post('/api/files/2/preUploadValidation', () => {
    return HttpResponse.json(
      envelope({
        attachmentId: 9001,
        presignedUrl: 'https://mock-bucket.s3.ap-southeast-1.amazonaws.com/uploads/mock',
        fields: { key: 'uploads/mock', policy: 'mock-policy', signature: 'mock-sig' },
      }),
    );
  }),

  http.get('/api/files/2/postUploadVerification', () => {
    return HttpResponse.json(envelope({ verified: true }));
  }),

  http.post('https://mock-bucket.s3.ap-southeast-1.amazonaws.com/uploads/mock', () => {
    return new HttpResponse(null, { status: 204 });
  }),
];
