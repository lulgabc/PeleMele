import { addDays, getISOWeek } from 'date-fns';
import { CalendarPlus, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
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
import { Avatar } from '../components/Avatar';
import { EmptyState, SectionHead } from '../components/Bits';
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
  const parentMembers = parents(state);
  const parentIds = parentMembers.map((member) => member.id);
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
          <p className="page-sub">{formatWeekRange(weekDay)} · 不用排满，也能过得很好。</p>
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
        </div>
      </div>

      <WeekWave days={days} selected={weekDay} eventsForDay={(day) => eventsForDay(state, day)} onSelect={selectWeekDay} />

      <div className="week-layout">
        <section className={`day-canvas ${isToday(weekDay) ? 'is-today' : ''}`}>
          <span className="day-canvas-blob" aria-hidden="true" />
          <div className="day-canvas-head">
            <div className="day-hero-date" aria-hidden="true">
              <span>{WEEKDAY_FULL[weekdayIndex(weekDay)]}</span>
              <strong>{weekDay.getDate()}</strong>
            </div>
            <div className="day-canvas-copy">
              <span className="eyebrow">{isToday(weekDay) ? 'TODAY' : 'DAY'}</span>
              <h2>{formatMonthDay(weekDay)} · {selectedEvents.length > 0 ? `${selectedEvents.length} 件事` : '留白'}</h2>
              <p>
                {selectedEvents.length > 0
                  ? '把时间花在一起，就是最好的安排。'
                  : '这一天还没有安排。要不要加一件小事？'}
              </p>
            </div>
            <button
              type="button"
              className="button button--primary button--small"
              onClick={() => openCreate({ date: weekDay })}
            >
              <CalendarPlus size={16} strokeWidth={2.5} />
              添加
            </button>
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

        <aside className="week-side">
          <div className="panel week-track">
            <SectionHead eyebrow="RHYTHM" title="这一周的量" />
            <div className="stat-list">
              <div className="stat-row">
                <span className="stat-icon stat-icon--coral">
                  <Sparkles size={17} strokeWidth={2.2} />
                </span>
                <span className="stat-label">家庭活动</span>
                <strong>{weekEvents.length}</strong>
              </div>
              <div className="stat-row">
                <span className="stat-icon stat-icon--mint">
                  <Sparkles size={17} strokeWidth={2.2} />
                </span>
                <span className="stat-label">合拍空档</span>
                <strong>{slots.length}</strong>
              </div>
              {busy && (
                <div className="stat-row stat-row--member">
                  <Avatar member={busy.member} size="sm" />
                  <span className="stat-label">这周最忙的是</span>
                  <strong>{busy.member.name}</strong>
                </div>
              )}
            </div>
          </div>

          <div className="panel week-notes">
            <SectionHead eyebrow="MAYBE" title="周末可以做" />
            <ul className="idea-list">
              <li>去河边搭一次帐篷</li>
              <li>把生日蛋糕换成一起做</li>
              <li>给果果拍一段四岁的小视频</li>
            </ul>
            <button
              type="button"
              className="text-button"
              onClick={() => openCreate({ date: addDays(weekDay, 2), kind: 'outing', title: '周末的小计划' })}
            >
              把它变成活动 <CalendarPlus size={14} strokeWidth={2.4} />
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
