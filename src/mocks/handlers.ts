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
    return HttpResponse.json(envelope(customGroups[0]));
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
        presignedUrl: 'https://mock-s3.local/upload',
        fields: { key: 'uploads/mock', policy: 'mock-policy', signature: 'mock-sig' },
      }),
    );
  }),

  http.get('/api/files/2/postUploadVerification', () => {
    return HttpResponse.json(envelope({ verified: true }));
  }),

  http.post('https://mock-s3.local/upload', () => {
    return new HttpResponse(null, { status: 204 });
  }),
];
