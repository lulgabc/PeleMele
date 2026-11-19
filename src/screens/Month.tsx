import { addMonths, isSameWeek } from 'date-fns';
import type { CSSProperties } from 'react';
import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatMonthYear, monthWeeks } from '../lib/dates';
import { eventsForDay, eventsInRange } from '../lib/selectors';
import { kindMeta } from '../lib/types';
import { useFamily } from '../state/FamilyContext';
import { useUI } from '../state/UIContext';
import { DayOrb } from '../components/DayOrb';

export function MonthScreen() {
  const { state } = useFamily();
  const { monthAnchor, setMonthAnchor, openDay, openCreate, openEdit } = useUI();
  const weeks = monthWeeks(monthAnchor);
  const monthStart = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
  const monthEnd = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0);
  const monthEvents = eventsInRange(state, monthStart, monthEnd);
  const birthdayCount = monthEvents.filter((event) => event.kind === 'birthday').length;
  const tripCount = monthEvents.filter((event) => event.kind === 'trip').length;
  const today = new Date();
  const addDate =
    monthAnchor.getFullYear() === today.getFullYear() && monthAnchor.getMonth() === today.getMonth()
      ? today
      : new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);

  return (
    <div className="page month-page">
      <div className="page-head">
        <div>
          <span className="eyebrow">MONTH GARDEN</span>
          <h1>{formatMonthYear(monthAnchor)}</h1>
          <p className="page-sub">
            {monthEvents.length} 个活动
            {birthdayCount > 0 ? ` · ${birthdayCount} 个生日` : ''}
            {tripCount > 0 ? ` · ${tripCount} 次出行` : ''}
          </p>
        </div>
        <div className="head-actions">
          <button
            type="button"
            className="icon-button"
            onClick={() => setMonthAnchor(addMonths(monthAnchor, -1))}
            aria-label="上个月"
          >
            <ChevronLeft size={20} strokeWidth={2.4} />
          </button>
          <button type="button" className="button button--soft button--small" onClick={() => setMonthAnchor(new Date())}>
            这个月
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => setMonthAnchor(addMonths(monthAnchor, 1))}
            aria-label="下个月"
          >
            <ChevronRight size={20} strokeWidth={2.4} />
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => openCreate({ date: addDate })}
            aria-label="添加活动"
          >
            <CalendarPlus size={19} strokeWidth={2.3} />
          </button>
        </div>
      </div>

      <div className="month-bands">
        {weeks.map((week) => {
          const weekStart = week[0]!;
          const currentWeek = isSameWeek(weekStart, new Date(), { weekStartsOn: 1 });
          return (
            <section className={`month-band ${currentWeek ? 'is-current' : ''}`} key={weekStart.toISOString()}>
              <div className="month-band-days">
                {week.map((day) => {
                  const dayEvents = eventsForDay(state, day);
                  const outside = day.getMonth() !== monthAnchor.getMonth();
                  return (
                    <div className={`month-cell ${outside ? 'is-outside' : ''}`} key={day.toISOString()}>
                      <DayOrb
                        date={day}
                        events={dayEvents}
                        variant="month"
                        dim={outside}
                        onClick={() => openDay(day)}
                      />
                      <div className="month-cell-events">
                        {dayEvents.slice(0, 2).map((event) => (
                          <button
                            key={event.id}
                            type="button"
                            className="month-chip"
                            style={{ '--kind': kindMeta(event.kind).color } as CSSProperties}
                            onClick={() => openEdit(event.id)}
                            title={event.title}
                          >
                            {event.title}
                          </button>
                        ))}
                        {dayEvents.length > 2 && (
                          <button type="button" className="month-more" onClick={() => openDay(day)}>
                            +{dayEvents.length - 2}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <p className="month-hint">点任意一天，查看当天安排。</p>
    </div>
  );
}
