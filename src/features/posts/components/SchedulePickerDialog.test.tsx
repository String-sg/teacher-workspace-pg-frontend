import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_SCHEDULE_WINDOW,
  SchedulePickerDialog,
  buildTimeSlots,
  filterPastSlots,
} from './SchedulePickerDialog';

describe('buildTimeSlots', () => {
  it('returns 60 slots between 07:00 and 21:45 inclusive for the default window', () => {
    const slots = buildTimeSlots(DEFAULT_SCHEDULE_WINDOW);
    expect(slots).toHaveLength(60);
    expect(slots[0]).toEqual({ value: '07:00', label: '7:00 AM' });
    expect(slots[slots.length - 1]).toEqual({ value: '21:45', label: '9:45 PM' });
  });

  it('emits every 15-min boundary between start and end inclusive', () => {
    const slots = buildTimeSlots({ start: '08:00', end: '10:00' });
    // 08:00, 08:15, 08:30, 08:45, 09:00, 09:15, 09:30, 09:45, 10:00 → 9 entries
    expect(slots.map((s) => s.value)).toEqual([
      '08:00',
      '08:15',
      '08:30',
      '08:45',
      '09:00',
      '09:15',
      '09:30',
      '09:45',
      '10:00',
    ]);
  });

  it('returns an empty array when end is before start', () => {
    expect(buildTimeSlots({ start: '10:00', end: '08:00' })).toEqual([]);
  });

  it('returns a single slot when start equals end and is 15-min aligned', () => {
    expect(buildTimeSlots({ start: '09:00', end: '09:00' })).toEqual([
      { value: '09:00', label: '9:00 AM' },
    ]);
  });

  it('rounds up a non-aligned start to the next 15-min boundary', () => {
    const slots = buildTimeSlots({ start: '08:05', end: '08:30' });
    expect(slots[0]?.value).toBe('08:15');
  });
});

describe('filterPastSlots', () => {
  const allSlots = buildTimeSlots(DEFAULT_SCHEDULE_WINDOW);

  it('removes slots within the 15-min lead time from now', () => {
    // current time 08:50 → cutoff = ceil((530+15)/15)*15 = ceil(545/15)*15 = ceil(36.3)*15 = 37*15 = 555 min = 09:15
    const filtered = filterPastSlots(allSlots, '08:50');
    expect(filtered[0]?.value).toBe('09:15');
  });

  it('returns all slots when current time is early enough', () => {
    // 00:00 → cutoff = 15 min = 00:15; first slot is 07:00 which is after 00:15
    const filtered = filterPastSlots(allSlots, '00:00');
    expect(filtered).toHaveLength(allSlots.length);
  });

  it('returns empty when current time is very late', () => {
    // 22:00 → cutoff = ceil((1320+15)/15)*15 = 1335 min = 22:15; all slots end at 21:45
    const filtered = filterPastSlots(allSlots, '22:00');
    expect(filtered).toHaveLength(0);
  });
});

describe('SchedulePickerDialog', () => {
  it('renders the dialog when open is true', () => {
    render(<SchedulePickerDialog open={true} onOpenChange={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByText('Schedule post')).toBeInTheDocument();
  });

  it('does not render dialog content when open is false', () => {
    render(<SchedulePickerDialog open={false} onOpenChange={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.queryByText('Schedule post')).not.toBeInTheDocument();
  });

  it('shows the allowed sending window in the time label', () => {
    render(
      <SchedulePickerDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        scheduleWindow={{ start: '08:00', end: '20:00' }}
      />,
    );
    expect(screen.getByText('08:00–20:00')).toBeInTheDocument();
  });

  it('disables the Schedule button when no date is selected', () => {
    render(<SchedulePickerDialog open={true} onOpenChange={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Schedule' })).toBeDisabled();
  });
});
