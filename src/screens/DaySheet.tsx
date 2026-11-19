import { CalendarPlus, Waves } from 'lucide-react';
import { eventsForDay } from '../lib/selectors';
import { formatMonthDay, weekdayIndex, WEEKDAY_FULL } from '../lib/dates';
import { useFamily } from '../state/FamilyContext';
import { useUI } from '../state/UIContext';
import { EventCard } from '../components/EventCard';
import { Sheet } from '../components/Sheet';

export function DaySheet() {
  const { state } = useFamily();
  const { daySheet, closeDay, openCreate, openEdit, selectWeekDay, go, toast } = useUI();
  if (!daySheet) return null;
  const events = eventsForDay(state, daySheet);

  return (
    <Sheet
      open
      onClose={closeDay}
      title={`${formatMonthDay(daySheet)} · ${WEEKDAY_FULL[weekdayIndex(daySheet)]}`}
      eyebrow="DAY STORY"
      size="md"
    >
      <div className="day-sheet-actions">
        <button
          type="button"
          className="button button--primary button--small"
          onClick={() => {
            closeDay();
            openCreate({ date: daySheet });
          }}
        >
          <CalendarPlus size={16} strokeWidth={2.5} /> 安排活动
        </button>
        <button
          type="button"
          className="button button--ghost button--small"
          onClick={() => {
            selectWeekDay(daySheet);
            go('week');
            closeDay();
            toast('已跳到这一周', 'info');
          }}
        >
          <Waves size={16} strokeWidth={2.2} /> 在节奏里看
        </button>
      </div>

      {events.length > 0 ? (
        <div className="day-sheet-list">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              showNotes
              onClick={() => {
                closeDay();
                openEdit(event.id);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="day-sheet-empty">
          <span aria-hidden="true">🌿</span>
          <p>这一天还没有安排。给家人留一点空白，也很好。</p>
        </div>
      )}
    </Sheet>
  );
}
