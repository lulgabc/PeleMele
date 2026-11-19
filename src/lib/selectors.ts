import { addDays, differenceInCalendarDays, parseISO, startOfDay } from 'date-fns';
import type { AppState, BusyBlock, FamilyEvent, Member } from './types';
import type { CommonWindow, Interval } from './availability';
import { findCommonWindows, rankWindows } from './availability';
import { createDemoBusy } from './seed';
import { eventStart, isEventOnDay } from './dates';

export function activeMembers(state: AppState): Member[] {
  return state.members.filter((member) => !member.deletedAt);
}

export function activeEvents(state: AppState): FamilyEvent[] {
  return state.events.filter((event) => !event.deletedAt);
}

export function membersById(state: AppState): Map<string, Member> {
  return new Map(activeMembers(state).map((member) => [member.id, member]));
}

export function parents(state: AppState): Member[] {
  return activeMembers(state).filter((member) => member.role === 'parent');
}

export function memberName(state: AppState, id: string): string {
  return activeMembers(state).find((member) => member.id === id)?.name ?? '家人';
}

export function eventsForDay(state: AppState, day: Date): FamilyEvent[] {
  return activeEvents(state)
    .filter((event) => isEventOnDay(event, day))
    .sort((a, b) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
      return eventStart(a).getTime() - eventStart(b).getTime();
    });
}

export function nextEvent(state: AppState, now = new Date()): FamilyEvent | null {
  return (
    activeEvents(state)
      .filter((event) => parseISO(event.end).getTime() > now.getTime())
      .sort((a, b) => eventStart(a).getTime() - eventStart(b).getTime())[0] ?? null
  );
}

/** The next thing worth looking forward to: trips/birthdays/outings before routine events. */
export function nextHighlight(state: AppState, now = new Date(), horizonDays = 45): FamilyEvent | null {
  const horizon = addDays(now, horizonDays).getTime();
  const candidates = activeEvents(state).filter(
    (event) => parseISO(event.end).getTime() > now.getTime() && eventStart(event).getTime() <= horizon,
  );
  const byStart = (a: FamilyEvent, b: FamilyEvent) => eventStart(a).getTime() - eventStart(b).getTime();
  const memorable = candidates
    .filter((event) => event.kind === 'trip' || event.kind === 'birthday' || event.kind === 'outing')
    .sort(byStart)[0];
  const nonRoutine = candidates.filter((event) => event.kind !== 'routine').sort(byStart)[0];
  return memorable ?? nonRoutine ?? nextEvent(state, now);
}

export function eventsOnDayCount(state: AppState, day: Date): number {
  return eventsForDay(state, day).length;
}

export function eventsInRange(state: AppState, start: Date, end: Date): FamilyEvent[] {
  const from = startOfDay(start).getTime();
  const to = addDays(startOfDay(end), 1).getTime();
  return activeEvents(state).filter((event) => {
    const s = eventStart(event).getTime();
    const e = parseISO(event.end).getTime();
    return s < to && e > from;
  });
}

export interface BusyMapResult {
  busyByMember: Record<string, Interval[]>;
  blocks: BusyBlock[];
  sourceByMember: Record<string, 'google' | 'demo' | 'none'>;
}

export function buildBusyMap(
  state: AppState,
  memberIds: string[],
  rangeStart: Date,
  rangeEnd: Date,
  options: { includeDemo?: boolean } = {},
): BusyMapResult {
  const includeDemo = options.includeDemo ?? state.google.demoBusy;
  const days = Math.max(1, differenceInCalendarDays(rangeEnd, rangeStart) + 1);
  const demo = includeDemo ? createDemoBusy(activeMembers(state), startOfDay(rangeStart), days + 1) : [];
  const from = startOfDay(rangeStart).getTime();
  const to = addDays(startOfDay(rangeEnd), 1).getTime();

  const blocks: BusyBlock[] = [];
  const sourceByMember: Record<string, 'google' | 'demo' | 'none'> = {};

  for (const memberId of memberIds) {
    const googleBlocks = state.google.busy.filter((block) => {
      if (block.memberId !== memberId) return false;
      const start = parseISO(block.start).getTime();
      const end = parseISO(block.end).getTime();
      return end > from && start < to;
    });
    const hasGoogle = googleBlocks.length > 0 || Boolean(state.google.busyMeta[memberId]);
    if (hasGoogle) {
      blocks.push(...googleBlocks);
      sourceByMember[memberId] = 'google';
    } else {
      const demoBlocks = demo.filter((block) => block.memberId === memberId);
      blocks.push(...demoBlocks);
      sourceByMember[memberId] = demoBlocks.length > 0 ? 'demo' : 'none';
    }
  }

  const busyByMember: Record<string, Interval[]> = {};
  for (const memberId of memberIds) {
    busyByMember[memberId] = blocks
      .filter((block) => block.memberId === memberId)
      .map((block) => ({ start: parseISO(block.start).getTime(), end: parseISO(block.end).getTime() }));
  }

  return { busyByMember, blocks, sourceByMember };
}

export interface CommonOptions {
  memberIds: string[];
  days?: number;
  windowStartHour?: number;
  windowEndHour?: number;
  minMinutes?: number;
  includeDemo?: boolean;
  adaptiveWeekday?: boolean;
  now?: Date;
}

export function commonWindows(state: AppState, options: CommonOptions): CommonWindow[] {
  const now = options.now ?? new Date();
  const days = options.days ?? 7;
  const rangeStart = startOfDay(now);
  const rangeEnd = addDays(rangeStart, days - 1);
  const { busyByMember } = buildBusyMap(state, options.memberIds, rangeStart, rangeEnd, {
    includeDemo: options.includeDemo,
  });
  return findCommonWindows({
    rangeStart,
    rangeEnd,
    memberIds: options.memberIds,
    busyByMember,
    events: activeEvents(state),
    windowStartHour: options.windowStartHour ?? 8,
    windowEndHour: options.windowEndHour ?? 22,
    minMinutes: options.minMinutes ?? 60,
    adaptiveWeekday: options.adaptiveWeekday ?? true,
  });
}

export function bestWindows(state: AppState, memberIds: string[], limit = 3, days = 10): CommonWindow[] {
  const windows = commonWindows(state, { memberIds, days, minMinutes: 75 });
  return rankWindows(windows, new Date(), limit);
}

export function nextCommonWindow(state: AppState, memberIds: string[], now = new Date()): CommonWindow | null {
  const windows = commonWindows(state, {
    memberIds,
    days: 12,
    minMinutes: 120,
    windowStartHour: 9,
    windowEndHour: 21,
    now,
  })
    .filter((window) => window.start > now.getTime())
    .sort((a, b) => a.start - b.start);
  return windows[0] ?? null;
}

export function busiestMember(state: AppState, rangeStart: Date, rangeEnd: Date): { member: Member; count: number } | null {
  const events = eventsInRange(state, rangeStart, rangeEnd);
  let best: { member: Member; count: number } | null = null;
  for (const member of activeMembers(state)) {
    const count = events.filter(
      (event) => event.memberIds.length === 0 || event.memberIds.includes(member.id),
    ).length;
    if (!best || count > best.count) best = { member, count };
  }
  return best;
}
