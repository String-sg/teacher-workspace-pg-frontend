import type { ApiConfig, ApiSession } from '~/features/posts/api/types';

export const session: ApiSession = {
  staffId: 1001,
  staffName: 'Ms Tan Wei Ling',
  isA: false,
  staffSchoolId: 1,
  staffEmailAdd: 'tan_wei_ling@greendale.edu.sg',
  is2FAAuthorized: true,
  schoolEmailAddress: 'general_office@greendale.edu.sg',
  schoolName: 'Greendale Primary School',
  sessionTimeLeft: 3600,
  displayName: 'Tan Wei Ling',
  displayEmail: 'tan_wei_ling@greendale.edu.sg',
  displayUpdatedBy: 'self',
  displayUpdatedAt: '2026-01-10T08:00:00+08:00',
  isAdminUpdated: false,
  isIhl: false,
  heyTaliaAccess: false,
};

export const configs: ApiConfig = {
  flags: {
    schedule_send: { enabled: true },
    duplicate_post: { enabled: true },
    shortcut_travel_declaration: { enabled: true },
    shortcut_edit_contact_details: { enabled: true },
  },
  configs: {
    schedule_window: { min_hours: 1, max_days: 30 },
  },
};
