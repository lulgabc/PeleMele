import type { CSSProperties } from 'react';
import { startOfDay } from 'date-fns';
import { isToday, weekdayIndex, WEEKDAY_MON } from '../lib/dates';
import type { FamilyEvent } from '../lib/types';
import { kindMeta } from '../lib/types';

export function DayOrb({
  date,
  events,
  selected = false,
  dim = false,
  variant = 'week',
  onClick,
}: {
  date: Date;
  events: FamilyEvent[];
  selected?: boolean;
  dim?: boolean;
  variant?: 'week' | 'month';
  onClick: () => void;
}) {
  const today = isToday(date);
  const past = startOfDay(date).getTime() < startOfDay(new Date()).getTime();
  const hasEvents = events.length > 0;
  const futureActive = !past && !today && hasEvents;
  const kinds = [...new Set(events.map((event) => event.kind))].slice(0, 3);
  const style = { '--lift': `${(weekdayIndex(date) % 3) * 3 - 3}px` } as CSSProperties;
  const label = `${date.getMonth() + 1}月${date.getDate()}日，${events.length} 个活动`;

  return (
    <button
      type="button"
      className={`day-orb day-orb--${variant} ${selected ? 'is-selected' : ''} ${today ? 'is-today' : ''} ${
        dim ? 'is-dim' : ''
      } ${past ? 'is-past' : ''} ${hasEvents ? 'has-events' : 'is-empty'} ${
        futureActive ? 'is-future-active' : ''
      }`}
      style={style}
      onClick={onClick}
      aria-pressed={selected}
      aria-label={label}
    >
      <span className="day-orb-weekday">{WEEKDAY_MON[weekdayIndex(date)]}</span>
      <span className="day-orb-date">{date.getDate()}</span>
      <span className="day-orb-dots" aria-hidden="true">
        {kinds.map((kind) => (
          <i key={kind} style={{ background: kindMeta(kind).color }} />
        ))}
      </span>
    </button>
  );
}

export function WeekWave({
  days,
  selected,
  eventsForDay,
  onSelect,
}: {
  days: Date[];
  selected: Date;
  eventsForDay: (day: Date) => FamilyEvent[];
  onSelect: (day: Date) => void;
}) {
  return (
    <div className="week-wave">
      <svg className="week-wave-squiggle" viewBox="0 0 700 120" preserveAspectRatio="none" aria-hidden="true">
        <path
          d="M10 66C78 26 138 26 206 62s128 36 196 0 128-36 196 0 78 26 92 18"
          fill="none"
          stroke="var(--line)"
          strokeWidth="3"
          strokeDasharray="2 11"
          strokeLinecap="round"
        />
      </svg>
      {days.map((day) => (
        <DayOrb
          key={day.toISOString()}
          date={day}
          events={eventsForDay(day)}
          selected={day.toDateString() === selected.toDateString()}
          onClick={() => onSelect(day)}
        />
      ))}
    </div>
  );
}
