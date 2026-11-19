import { addMonths, isSameWeek } from 'date-fns';
import type { CSSProperties } from 'react';
import { CalendarPlus, ChevronLeft, ChevronRight, Flower2, Sparkles } from 'lucide-react';
import {
  formatMonthYear,
  formatMonthDay,
  monthWeeks,
  weekdayIndex,
  WEEKDAY_FULL,
  WEEKDAY_MON,
} from '../lib/dates';
import { eventsForDay, eventsInRange } from '../lib/selectors';
import { kindMeta } from '../lib/types';
import { useFamily } from '../state/FamilyContext';
import { useUI } from '../state/UIContext';
import { EventCard } from '../components/EventCard';
import { DayOrb } from '../components/DayOrb';
import { SectionHead } from '../components/Bits';

export function MonthScreen() {
  const { state } = useFamily();
  const { monthAnchor, setMonthAnchor, openDay, openCreate, openEdit } = useUI();
  const weeks = monthWeeks(monthAnchor);
  const monthStart = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
  const monthEnd = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0);
  const monthEvents = eventsInRange(state, monthStart, monthEnd);
  const highlights = monthEvents
    .filter((event) => event.kind !== 'routine')
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 6);
  const birthdayCount = monthEvents.filter((event) => event.kind === 'birthday').length;
  const tripCount = monthEvents.filter((event) => event.kind === 'trip').length;
  const visibleKinds = [...new Set(monthEvents.map((event) => event.kind))];

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
            。每一天都长成了自己的样子。
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
        </div>
      </div>

      <div className="month-legend" aria-label="活动类型">
        {visibleKinds.map((kind) => {
          const meta = kindMeta(kind);
          return (
            <span key={kind} className="legend-chip">
              <i style={{ background: meta.color }} aria-hidden="true" />
              {meta.emoji} {meta.label}
            </span>
          );
        })}
        <span className="month-legend-note">
          <Flower2 size={15} strokeWidth={2.2} /> 点一天，看它的故事
        </span>
      </div>

      <div className="month-bands">
        {weeks.map((week) => {
          const weekStart = week[0]!;
          const bandEvents = eventsInRange(state, week[0]!, week[6]!);
          const currentWeek = isSameWeek(weekStart, new Date(), { weekStartsOn: 1 });
          return (
            <section className={`month-band ${currentWeek ? 'is-current' : ''}`} key={weekStart.toISOString()}>
              <div className="month-band-head">
                <span>
                  {formatMonthDay(weekStart)} – {formatMonthDay(week[6]!)}
                </span>
                <span className="month-band-count">
                  {bandEvents.length > 0 ? `${bandEvents.length} 个活动` : '留白'}
                  {currentWeek && <em className="month-week-badge">本周</em>}
                </span>
              </div>
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

      <section className="month-highlights">
        <SectionHead
          eyebrow="BIG MOMENTS"
          title="本月高光"
          action={
            <button
              type="button"
              className="text-button"
              onClick={() =>
                openCreate({
                  date: new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), Math.min(15, new Date().getDate())),
                  kind: 'outing',
                })
              }
            >
              <CalendarPlus size={14} strokeWidth={2.4} /> 加一个
            </button>
          }
        />
        {highlights.length > 0 ? (
          <div className="highlight-scroll">
            {highlights.map((event) => (
              <div className="highlight-scroll-item" key={event.id}>
                <EventCard event={event} variant="poster" onClick={() => openEdit(event.id)} />
                <span className="highlight-scroll-date">
                  {formatMonthDay(event.start)} · {WEEKDAY_FULL[weekdayIndex(new Date(event.start))]}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="month-empty-highlight">
            <Sparkles size={18} strokeWidth={2.2} />
            <p>这个月还没有旅行或生日。要不要制造一个高光？</p>
          </div>
        )}
      </section>

      <p className="month-footnote">
        每一周都是一条纸带，七天是纸带上的七个扣子。{WEEKDAY_MON.join(' · ')}
      </p>
    </div>
  );
}
