import { describe, expect, it } from 'vitest';
import { addDays, startOfDay } from 'date-fns';
import { monthWeeks, weekDays, formatEventWhen, eventsOnDay, weekdayIndex, toDateTime, dateInputValue } from '../lib/dates';
import type { FamilyEvent } from '../lib/types';

function allDayEvent(start: Date, days: number): FamilyEvent {
  const end = addDays(startOfDay(start), days);
  return {
    id: `e-${start.toISOString()}`,
    title: '海边',
    kind: 'trip',
    start: start.toISOString(),
    end: end.toISOString(),
    allDay: true,
    memberIds: [],
    createdAt: start.toISOString(),
    updatedAt: start.toISOString(),
  };
}

describe('date helpers', () => {
  it('uses Monday-first weeks', () => {
    const days = weekDays(new Date(2026, 10, 19));
    expect(days[0]!.getDay()).toBe(1);
    expect(days[6]!.getDay()).toBe(0);
    expect(weekdayIndex(new Date(2026, 10, 19))).toBe(3);
  });

  it('lays out a month in Monday-first week bands', () => {
    const weeks = monthWeeks(new Date(2026, 10, 1));
    expect(weeks.length).toBeGreaterThanOrEqual(5);
    expect(weeks[0]![0]!.getDay()).toBe(1);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
  });

  it('lists multi-day events on every day they span', () => {
    const event = allDayEvent(new Date(2026, 10, 21), 2);
    expect(eventsOnDay([event], new Date(2026, 10, 20))).toHaveLength(0);
    expect(eventsOnDay([event], new Date(2026, 10, 21))).toHaveLength(1);
    expect(eventsOnDay([event], new Date(2026, 10, 22))).toHaveLength(1);
    expect(eventsOnDay([event], new Date(2026, 10, 23))).toHaveLength(0);
  });

  it('formats all-day ranges without an off-by-one day', () => {
    const event = allDayEvent(new Date(2026, 10, 21), 2);
    expect(formatEventWhen(event)).toContain('全天');
    expect(formatEventWhen(event)).toContain('11月21日');
    expect(formatEventWhen(event)).toContain('11月22日');
  });

  it('builds local dates from date and time inputs', () => {
    const date = toDateTime('2026-11-21', '14:30');
    expect(dateInputValue(date)).toBe('2026-11-21');
    expect(date.getHours()).toBe(14);
    expect(date.getMinutes()).toBe(30);
  });
});
