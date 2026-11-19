import { describe, expect, it } from 'vitest';
import { addDays, set, startOfDay } from 'date-fns';
import {
  findCommonWindows,
  findConflicts,
  intersectIntervals,
  mergeIntervals,
  subtractIntervals,
  type Interval,
} from '../lib/availability';
import type { FamilyEvent } from '../lib/types';
import { iso } from '../lib/dates';

const base = startOfDay(new Date(2026, 10, 16));
const at = (dayOffset: number, hour: number, minute = 0) =>
  set(addDays(base, dayOffset), { hours: hour, minutes: minute, seconds: 0, milliseconds: 0 });
const hours = (date: Date) => date.getTime();

const event = (title: string, start: Date, end: Date, memberIds: string[]): FamilyEvent => ({
  id: title,
  title,
  kind: 'outing',
  start: iso(start),
  end: iso(end),
  allDay: false,
  memberIds,
  createdAt: iso(start),
  updatedAt: iso(start),
});

describe('interval math', () => {
  it('merges overlapping and touching intervals', () => {
    const input: Interval[] = [
      { start: 10, end: 20 },
      { start: 15, end: 30 },
      { start: 30, end: 40 },
      { start: 60, end: 70 },
    ];
    expect(mergeIntervals(input)).toEqual([
      { start: 10, end: 40 },
      { start: 60, end: 70 },
    ]);
  });

  it('subtracts busy blocks from a window', () => {
    expect(
      subtractIntervals(
        [{ start: 0, end: 100 }],
        [
          { start: 20, end: 30 },
          { start: 25, end: 45 },
          { start: 80, end: 120 },
        ],
      ),
    ).toEqual([
      { start: 0, end: 20 },
      { start: 45, end: 80 },
    ]);
  });

  it('intersects two interval lists', () => {
    expect(
      intersectIntervals(
        [
          { start: 0, end: 30 },
          { start: 50, end: 90 },
        ],
        [
          { start: 20, end: 60 },
          { start: 70, end: 100 },
        ],
      ),
    ).toEqual([
      { start: 20, end: 30 },
      { start: 50, end: 60 },
      { start: 70, end: 90 },
    ]);
  });
});

describe('common windows', () => {
  it('finds the intersection of two parents’ free time', () => {
    const day = at(0, 0);
    const windows = findCommonWindows({
      rangeStart: day,
      rangeEnd: day,
      memberIds: ['mom', 'dad'],
      busyByMember: {
        mom: [{ start: hours(at(0, 9)), end: hours(at(0, 12)) }],
        dad: [{ start: hours(at(0, 10)), end: hours(at(0, 11)) }],
      },
      events: [],
      windowStartHour: 8,
      windowEndHour: 22,
      minMinutes: 60,
    });
    expect(windows.map((window) => [window.durationMin, new Date(window.start).getHours()])).toEqual([
      [60, 8],
      [600, 12],
    ]);
  });

  it('blocks the whole family for a family event', () => {
    const day = at(0, 0);
    const windows = findCommonWindows({
      rangeStart: day,
      rangeEnd: day,
      memberIds: ['mom', 'dad'],
      busyByMember: {},
      events: [event('露营', at(0, 18), at(0, 20), [])],
      windowStartHour: 8,
      windowEndHour: 22,
      minMinutes: 30,
    });
    expect(windows.some((window) => new Date(window.start).getHours() === 18)).toBe(false);
    expect(windows.map((window) => new Date(window.start).getHours())).toEqual([8, 20]);
  });

  it('does not block parents for a child-only event', () => {
    const day = at(0, 0);
    const windows = findCommonWindows({
      rangeStart: day,
      rangeEnd: day,
      memberIds: ['mom', 'dad'],
      busyByMember: {},
      events: [event('游泳课', at(0, 16), at(0, 17), ['kid'])],
      windowStartHour: 8,
      windowEndHour: 22,
      minMinutes: 60,
    });
    expect(windows).toHaveLength(1);
    expect(windows[0]!.durationMin).toBe(840);
  });

  it('honours the minimum duration and the day window', () => {
    const day = at(0, 0);
    const windows = findCommonWindows({
      rangeStart: day,
      rangeEnd: day,
      memberIds: ['a'],
      busyByMember: { a: [{ start: hours(at(0, 8)), end: hours(at(0, 21, 30)) }] },
      events: [],
      windowStartHour: 8,
      windowEndHour: 22,
      minMinutes: 60,
    });
    expect(windows).toHaveLength(0);
  });

  it('covers multiple days', () => {
    const windows = findCommonWindows({
      rangeStart: at(0, 0),
      rangeEnd: at(2, 0),
      memberIds: ['a'],
      busyByMember: {},
      events: [],
      windowStartHour: 8,
      windowEndHour: 22,
      minMinutes: 120,
    });
    expect(windows).toHaveLength(3);
  });
});

describe('conflicts', () => {
  it('reports overlapping activities that share a participant', () => {
    const events = [event('游泳课', at(0, 16), at(0, 17), ['kid', 'mom'])];
    const conflicts = findConflicts(
      { start: iso(at(0, 16, 30)), end: iso(at(0, 17, 30)), memberIds: ['mom'] },
      events,
    );
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]!.overlapMinutes).toBe(30);
  });

  it('ignores unrelated participants and the event being edited', () => {
    const events = [event('游泳课', at(0, 16), at(0, 17), ['kid'])];
    expect(
      findConflicts({ start: iso(at(0, 16)), end: iso(at(0, 17)), memberIds: ['dad'] }, events),
    ).toHaveLength(0);
    expect(
      findConflicts(
        { id: '游泳课', start: iso(at(0, 16)), end: iso(at(0, 17)), memberIds: ['kid'] },
        events,
      ),
    ).toHaveLength(0);
  });
});
