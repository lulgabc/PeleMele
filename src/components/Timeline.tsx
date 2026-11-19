import { formatTime, eventStart, eventEnd, isToday } from '../lib/dates';
import { kindMeta, type FamilyEvent } from '../lib/types';
import { EventCard } from './EventCard';

export function Timeline({
  events,
  day,
  onEventClick,
  variant = 'today',
}: {
  events: FamilyEvent[];
  day: Date;
  onEventClick: (id: string) => void;
  variant?: 'today' | 'story';
}) {
  const now = new Date();
  const isCurrentDay = isToday(day, now);
  const insertAt = isCurrentDay
    ? events.findIndex((event) => !event.allDay && eventStart(event).getTime() > now.getTime())
    : -1;
  const markerAfterAll = isCurrentDay && insertAt === -1;

  return (
    <div className={`timeline timeline--${variant}`}>
      <div className="timeline-spine" aria-hidden="true" />
      {events.map((event, index) => {
        const kind = kindMeta(event.kind);
        const past = isCurrentDay && eventEnd(event).getTime() < now.getTime();
        return (
          <div key={event.id} className="timeline-group">
            {isCurrentDay && index === insertAt && <NowMarker now={now} />}
            <div
              className={`timeline-item ${index % 2 === 1 ? 'is-right' : 'is-left'} ${past ? 'is-past' : ''}`}
            >
              <div className="timeline-time">
                {event.allDay ? '全天' : formatTime(event.start)}
                {!event.allDay && <small>{formatTime(event.end)}</small>}
              </div>
              <span className="timeline-dot" style={{ background: kind.color }} aria-hidden="true" />
              <div className="timeline-card">
                <EventCard event={event} onClick={() => onEventClick(event.id)} showParticipants />
              </div>
            </div>
          </div>
        );
      })}
      {markerAfterAll && <NowMarker now={now} />}
    </div>
  );
}

function NowMarker({ now }: { now: Date }) {
  return (
    <div className="now-marker">
      <span className="now-pill">
        <span className="now-dot" aria-hidden="true" />
        现在 · {formatTime(now)}
      </span>
    </div>
  );
}
