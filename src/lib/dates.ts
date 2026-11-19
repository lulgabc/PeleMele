import {
  addDays,
  differenceInCalendarDays,
  differenceInMinutes,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  set,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type { FamilyEvent } from './types';

export const WEEKDAY_MON = ['一', '二', '三', '四', '五', '六', '日'];
export const WEEKDAY_FULL = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

export function uid(prefix = 'x'): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`;
}

export function weekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function weekDays(anchor: Date): Date[] {
  const start = weekStart(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Monday-first index: Mon = 0 … Sun = 6. */
export function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

export function monthWeeks(anchor: Date): Date[][] {
  const first = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
  const last = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 });
  const weeks: Date[][] = [];
  let cursor = first;
  while (!isAfter(cursor, last)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(cursor, i)));
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

export function dayKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function iso(date: Date): string {
  return date.toISOString();
}

export function atTime(day: Date, hours: number, minutes = 0): Date {
  return set(day, { hours, minutes, seconds: 0, milliseconds: 0 });
}

export function isToday(date: Date, now = new Date()): boolean {
  return isSameDay(date, now);
}

export function isWeekend(date: Date): boolean {
  const d = date.getDay();
  return d === 0 || d === 6;
}

export function formatTime(value: string | Date): string {
  const d = typeof value === 'string' ? parseISO(value) : value;
  return format(d, 'HH:mm');
}

export function formatMonthDay(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'M月d日');
}

export function formatMonth(date: Date): string {
  return `${date.getMonth() + 1} 月`;
}

export function formatMonthYear(date: Date): string {
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
}

export function formatWeekRange(anchor: Date): string {
  const days = weekDays(anchor);
  const first = days[0]!;
  const last = days[6]!;
  if (first.getMonth() === last.getMonth()) {
    return `${first.getMonth() + 1} 月 ${first.getDate()} – ${last.getDate()} 日`;
  }
  return `${first.getMonth() + 1} 月 ${first.getDate()} 日 – ${last.getMonth() + 1} 月 ${last.getDate()} 日`;
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 5) return '夜深了';
  if (h < 11) return '早上好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

export function relativeDayLabel(target: Date, now = new Date()): string {
  const diff = differenceInCalendarDays(startOfDay(target), startOfDay(now));
  if (diff === 0) return '今天';
  if (diff === 1) return '明天';
  if (diff === 2) return '后天';
  if (diff === -1) return '昨天';
  if (diff > 2 && diff < 7) return `${diff} 天后`;
  return formatMonthDay(target);
}

export function countdownLabel(target: Date, now = new Date()): string {
  const diff = differenceInCalendarDays(startOfDay(target), startOfDay(now));
  if (diff <= 0) return '就是今天';
  if (diff === 1) return '明天见';
  if (diff < 7) return `还有 ${diff} 天`;
  if (diff < 30) return `还有 ${Math.ceil(diff / 7)} 周`;
  return `还有 ${Math.round(diff / 30)} 个月`;
}

export function eventStart(event: FamilyEvent): Date {
  return parseISO(event.start);
}

export function eventEnd(event: FamilyEvent): Date {
  return parseISO(event.end);
}

export function isEventOnDay(event: FamilyEvent, day: Date): boolean {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = addDays(startOfDay(day), 1).getTime();
  const start = eventStart(event).getTime();
  const end = Math.max(eventEnd(event).getTime(), start + 1);
  return start < dayEnd && end > dayStart;
}

export function eventsOnDay(events: FamilyEvent[], day: Date): FamilyEvent[] {
  return events
    .filter((event) => !event.deletedAt && isEventOnDay(event, day))
    .sort((a, b) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
      return eventStart(a).getTime() - eventStart(b).getTime();
    });
}

export function formatEventWhen(event: FamilyEvent, now = new Date()): string {
  const start = eventStart(event);
  const end = eventEnd(event);
  const dayLabel = isToday(start, now) ? '今天' : `${formatMonthDay(start)} ${WEEKDAY_FULL[weekdayIndex(start)]}`;
  if (event.allDay) {
    const lastDay = addDays(startOfDay(end), end.getTime() === startOfDay(end).getTime() ? -1 : 0);
    if (differenceInCalendarDays(lastDay, start) > 0) {
      return `${formatMonthDay(start)} – ${formatMonthDay(lastDay)} · 全天`;
    }
    return `${dayLabel} · 全天`;
  }
  return `${dayLabel} ${formatTime(start)}–${formatTime(end)}`;
}

export function formatCountdown(event: FamilyEvent, now = new Date()): string {
  const start = eventStart(event);
  if (isBefore(start, now) && isAfter(eventEnd(event), now)) return '正在进行';
  return countdownLabel(start, now);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} 分钟`;
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} 小时`;
}

export function minutesBetween(start: string | Date, end: string | Date): number {
  const a = typeof start === 'string' ? parseISO(start) : start;
  const b = typeof end === 'string' ? parseISO(end) : end;
  return Math.max(0, differenceInMinutes(b, a));
}

export function dateInputValue(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function timeInputValue(date: Date): string {
  return format(date, 'HH:mm');
}

export function toDateTime(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
}

export function addMonthsSafe(date: Date, amount: number): Date {
  const target = new Date(date);
  const day = target.getDate();
  target.setDate(1);
  target.setMonth(target.getMonth() + amount);
  const maxDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(day, maxDay));
  return target;
}

export function upcomingDays(from: Date, count: number): Date[] {
  const start = startOfDay(from);
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}
