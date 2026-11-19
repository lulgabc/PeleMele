import { addDays, isAfter, startOfDay } from 'date-fns';
import type { FamilyEvent } from './types';
import { eventEnd, eventStart, isWeekend } from './dates';

export interface Interval {
  start: number;
  end: number;
}

export interface CommonWindow extends Interval {
  durationMin: number;
}

export interface DayAvailability {
  start: number;
  end: number;
  busy: Interval[];
  free: Interval[];
}

export function mergeIntervals(input: Interval[]): Interval[] {
  const sorted = input
    .filter((i) => Number.isFinite(i.start) && Number.isFinite(i.end) && i.end > i.start)
    .map((i) => ({ start: i.start, end: i.end }))
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const merged: Interval[] = [];
  for (const current of sorted) {
    const last = merged[merged.length - 1];
    if (last && current.start <= last.end) {
      last.end = Math.max(last.end, current.end);
    } else {
      merged.push(current);
    }
  }
  return merged;
}

export function subtractIntervals(base: Interval[], blocks: Interval[]): Interval[] {
  let result = base
    .filter((i) => i.end > i.start)
    .map((i) => ({ start: i.start, end: i.end }));

  for (const block of mergeIntervals(blocks)) {
    const next: Interval[] = [];
    for (const segment of result) {
      if (block.end <= segment.start || block.start >= segment.end) {
        next.push(segment);
        continue;
      }
      if (block.start > segment.start) {
        next.push({ start: segment.start, end: Math.min(block.start, segment.end) });
      }
      if (block.end < segment.end) {
        next.push({ start: Math.max(block.end, segment.start), end: segment.end });
      }
    }
    result = next;
  }
  return result.filter((i) => i.end > i.start);
}

export function intersectIntervals(a: Interval[], b: Interval[]): Interval[] {
  const out: Interval[] = [];
  let i = 0;
  let j = 0;
  const left = mergeIntervals(a);
  const right = mergeIntervals(b);
  while (i < left.length && j < right.length) {
    const start = Math.max(left[i]!.start, right[j]!.start);
    const end = Math.min(left[i]!.end, right[j]!.end);
    if (end > start) out.push({ start, end });
    if (left[i]!.end < right[j]!.end) i += 1;
    else j += 1;
  }
  return out;
}

export function intersectMany(lists: Interval[][]): Interval[] {
  if (lists.length === 0) return [];
  return lists.reduce((acc, list) => intersectIntervals(acc, list));
}

export function intervalMinutes(interval: Interval): number {
  return Math.max(0, (interval.end - interval.start) / 60_000);
}

export function eventInvolves(event: FamilyEvent, memberIds: string[]): boolean {
  if (memberIds.length === 0) return true;
  if (event.memberIds.length === 0) return true;
  return event.memberIds.some((id) => memberIds.includes(id));
}

export function eventBlocksForWindow(
  event: FamilyEvent,
  windowStart: number,
  windowEnd: number,
): Interval | null {
  const start = Math.max(eventStart(event).getTime(), windowStart);
  const end = Math.min(eventEnd(event).getTime(), windowEnd);
  if (end <= start) return null;
  return { start, end };
}

export interface FindCommonOptions {
  rangeStart: Date;
  /** Inclusive last day. */
  rangeEnd: Date;
  memberIds: string[];
  busyByMember: Record<string, Interval[]>;
  events: FamilyEvent[];
  windowStartHour?: number;
  windowEndHour?: number;
  minMinutes?: number;
  /** On weekdays, start no earlier than 18:00. Weekends keep the full window. */
  adaptiveWeekday?: boolean;
}

interface DayParts {
  day: Date;
  windowStart: Date;
  windowEnd: Date;
  familyBlocks: Interval[];
  busy: Interval[];
  free: Interval[];
}

function buildDayParts(day: Date, options: FindCommonOptions): DayParts {
  const baseStartHour = options.windowStartHour ?? 8;
  const windowEndHour = options.windowEndHour ?? 22;
  const weekday = day.getDay() >= 1 && day.getDay() <= 5;
  const windowStartHour = options.adaptiveWeekday && weekday ? Math.max(baseStartHour, 18) : baseStartHour;
  const windowStart = new Date(day);
  windowStart.setHours(windowStartHour, 0, 0, 0);
  const windowEnd = new Date(day);
  windowEnd.setHours(windowEndHour, 0, 0, 0);
  if (windowEnd.getTime() <= windowStart.getTime()) {
    return {
      day,
      windowStart,
      windowEnd: windowStart,
      familyBlocks: [],
      busy: [],
      free: [],
    };
  }
  const ws = windowStart.getTime();
  const we = windowEnd.getTime();

  const familyBlocks = options.events
    .filter((event) => !event.deletedAt && eventInvolves(event, options.memberIds))
    .map((event) => eventBlocksForWindow(event, ws, we))
    .filter((block): block is Interval => block !== null);

  const freeLists: Interval[][] = [];
  const allBusy: Interval[] = [...familyBlocks];
  for (const memberId of options.memberIds) {
    const personal = mergeIntervals(
      (options.busyByMember[memberId] ?? [])
        .map((block) => ({
          start: Math.max(block.start, ws),
          end: Math.min(block.end, we),
        }))
        .filter((block) => block.end > block.start),
    );
    allBusy.push(...personal);
    const occupied = mergeIntervals([...personal, ...familyBlocks]);
    freeLists.push(subtractIntervals([{ start: ws, end: we }], occupied));
  }

  const free = intersectMany(freeLists);
  return {
    day,
    windowStart,
    windowEnd,
    familyBlocks,
    busy: subtractIntervals([{ start: ws, end: we }], free),
    free,
  };
}

function daysBetweenInclusive(rangeStart: Date, rangeEnd: Date): Date[] {
  const days: Date[] = [];
  let cursor = startOfDay(rangeStart);
  const last = startOfDay(rangeEnd);
  while (!isAfter(cursor, last)) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function findCommonWindows(options: FindCommonOptions): CommonWindow[] {
  if (options.memberIds.length === 0) return [];
  const minMinutes = options.minMinutes ?? 60;
  const windows: CommonWindow[] = [];

  for (const day of daysBetweenInclusive(options.rangeStart, options.rangeEnd)) {
    const parts = buildDayParts(day, options);
    for (const interval of parts.free) {
      const minutes = intervalMinutes(interval);
      if (minutes >= minMinutes) {
        windows.push({ ...interval, durationMin: minutes });
      }
    }
  }
  return windows;
}

export function getDayAvailability(day: Date, options: Omit<FindCommonOptions, 'rangeStart' | 'rangeEnd'>): DayAvailability {
  const parts = buildDayParts(startOfDay(day), {
    ...options,
    rangeStart: day,
    rangeEnd: day,
    minMinutes: 1,
  });
  return {
    start: parts.windowStart.getTime(),
    end: parts.windowEnd.getTime(),
    busy: mergeIntervals(parts.busy),
    free: parts.free,
  };
}

export function rankWindows(windows: CommonWindow[], now = new Date(), limit = 3): CommonWindow[] {
  const nowMs = now.getTime();
  return [...windows]
    .filter((window) => window.end > nowMs)
    .sort((a, b) => scoreWindow(b, nowMs) - scoreWindow(a, nowMs) || a.start - b.start)
    .slice(0, limit);
}

function scoreWindow(window: CommonWindow, nowMs: number): number {
  const start = new Date(window.start);
  const daysAhead = Math.max(0, (start.getTime() - nowMs) / 86_400_000);
  const weekendBonus = isWeekend(start) ? 1.22 : 1;
  const eveningBonus = start.getHours() >= 17 ? 12 : 0;
  return window.durationMin * weekendBonus + eveningBonus - daysAhead * 4;
}

export function groupWindowsByDay(windows: CommonWindow[]): Map<string, CommonWindow[]> {
  const map = new Map<string, CommonWindow[]>();
  for (const window of windows) {
    const key = new Date(window.start).toDateString();
    const list = map.get(key) ?? [];
    list.push(window);
    map.set(key, list);
  }
  return map;
}

export interface Conflict {
  event: FamilyEvent;
  overlapMinutes: number;
}

export function findConflicts(
  candidate: Pick<FamilyEvent, 'start' | 'end' | 'memberIds'> & { id?: string },
  events: FamilyEvent[],
): Conflict[] {
  const start = new Date(candidate.start).getTime();
  const end = new Date(candidate.end).getTime();
  if (!(end > start)) return [];

  return events
    .filter((event) => !event.deletedAt && event.id !== candidate.id)
    .map((event) => {
      const cStart = Math.max(start, eventStart(event).getTime());
      const cEnd = Math.min(end, eventEnd(event).getTime());
      if (cEnd <= cStart) return null;
      const sharesMember =
        candidate.memberIds.length === 0 ||
        event.memberIds.length === 0 ||
        event.memberIds.some((id) => candidate.memberIds.includes(id));
      if (!sharesMember) return null;
      return { event, overlapMinutes: (cEnd - cStart) / 60_000 };
    })
    .filter((conflict): conflict is Conflict => conflict !== null)
    .sort((a, b) => eventStart(a.event).getTime() - eventStart(b.event).getTime());
}
