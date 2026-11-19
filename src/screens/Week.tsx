import { addDays, getISOWeek } from 'date-fns';
import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  eventsInRange,
  busiestMember,
  commonWindows,
  eventsForDay,
  parents,
} from '../lib/selectors';
import {
  formatMonthDay,
  formatWeekRange,
  isToday,
  weekdayIndex,
  WEEKDAY_FULL,
  weekDays,
} from '../lib/dates';
import { useFamily } from '../state/FamilyContext';
import { useUI } from '../state/UIContext';
import { EmptyState } from '../components/Bits';
import { WeekWave } from '../components/DayOrb';
import { Timeline } from '../components/Timeline';

export function WeekScreen() {
  const { state } = useFamily();
  const { weekDay, selectWeekDay, openCreate, openEdit } = useUI();
  const days = weekDays(weekDay);
  const selectedEvents = eventsForDay(state, weekDay);
  const rangeStart = days[0]!;
  const rangeEnd = days[6]!;
  const weekEvents = eventsInRange(state, rangeStart, rangeEnd);
  const parentIds = parents(state).map((member) => member.id);
  const slots = parentIds.length >= 2
    ? commonWindows(state, { memberIds: parentIds, days: 7, now: rangeStart, minMinutes: 90 })
    : [];
  const busy = busiestMember(state, rangeStart, rangeEnd);

  return (
    <div className="page week-page">
      <div className="page-head">
        <div>
          <span className="eyebrow">WEEK {getISOWeek(weekDay)}</span>
          <h1>这一周的节奏</h1>
          <p className="page-sub">{formatWeekRange(weekDay)}</p>
        </div>
        <div className="head-actions">
          <button
            type="button"
            className="icon-button"
            onClick={() => selectWeekDay(addDays(weekDay, -7))}
            aria-label="上一周"
          >
            <ChevronLeft size={20} strokeWidth={2.4} />
          </button>
          <button
            type="button"
            className="button button--soft button--small"
            onClick={() => selectWeekDay(new Date())}
          >
            今天
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => selectWeekDay(addDays(weekDay, 7))}
            aria-label="下一周"
          >
            <ChevronRight size={20} strokeWidth={2.4} />
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => openCreate({ date: weekDay })}
            aria-label="添加活动"
          >
            <CalendarPlus size={19} strokeWidth={2.3} />
          </button>
        </div>
      </div>

      <WeekWave days={days} selected={weekDay} eventsForDay={(day) => eventsForDay(state, day)} onSelect={selectWeekDay} />

      <div className="week-summary">
        <span>
          <strong>{weekEvents.length}</strong> 个活动
        </span>
        <span className="summary-sep" aria-hidden="true" />
        <span>
          <strong>{slots.length}</strong> 段合拍空档
        </span>
        {busy && (
          <span className="week-summary-muted">
            <i style={{ background: busy.member.color }} aria-hidden="true" />
            {busy.member.name} 最忙
          </span>
        )}
      </div>

      <section className={`day-canvas ${isToday(weekDay) ? 'is-today' : ''}`}>
        <div className="day-canvas-head">
          <div className="day-hero-date" aria-hidden="true">
            <span>{WEEKDAY_FULL[weekdayIndex(weekDay)]}</span>
            <strong>{weekDay.getDate()}</strong>
          </div>
          <div className="day-canvas-copy">
            <h2>{formatMonthDay(weekDay)} · {selectedEvents.length > 0 ? `${selectedEvents.length} 件事` : '留白'}</h2>
          </div>
        </div>

        {selectedEvents.length > 0 ? (
          <Timeline events={selectedEvents} day={weekDay} onEventClick={openEdit} variant="story" />
        ) : (
          <EmptyState
            title="给这天留一点空白"
            description="或者，把它留给你们最想一起做的那件事。"
            actionLabel="安排活动"
            onAction={() => openCreate({ date: weekDay })}
          />
        )}
      </section>
    </div>
  );
}
