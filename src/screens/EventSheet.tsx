import { useMemo, useState, type CSSProperties } from 'react';
import { Sparkles, Trash2 } from 'lucide-react';
import { addDays, parseISO, startOfDay, subDays } from 'date-fns';
import {
  dateInputValue,
  formatDuration,
  iso,
  timeInputValue,
  toDateTime,
  uid,
} from '../lib/dates';
import { findConflicts } from '../lib/availability';
import { EVENT_KINDS, type EventKind, type FamilyEvent } from '../lib/types';
import { activeMembers } from '../lib/selectors';
import type { EventPrefill } from '../state/UIContext';
import { useFamily } from '../state/FamilyContext';
import { useUI } from '../state/UIContext';
import { Avatar } from '../components/Avatar';
import { Sheet } from '../components/Sheet';

export function EventSheet() {
  const { state, dispatch } = useFamily();
  const { eventSheet, closeEventSheet, toast } = useUI();
  const members = activeMembers(state);
  if (!eventSheet) return null;

  const existing =
    eventSheet.mode === 'edit'
      ? state.events.find((event) => event.id === eventSheet.eventId && !event.deletedAt)
      : undefined;
  if (eventSheet.mode === 'edit' && !existing) return null;

  return (
    <Sheet
      open
      onClose={closeEventSheet}
      title={existing ? '编辑活动' : '安排一件小事'}
      eyebrow={existing ? 'EDIT MOMENT' : 'NEW MOMENT'}
      size="md"
    >
      <EventForm
        key={existing?.id ?? `new-${eventSheet.prefill?.date?.toISOString() ?? 'now'}-${eventSheet.prefill?.startTime ?? ''}`}
        existing={existing ?? null}
        prefill={eventSheet.prefill}
        members={members}
        events={state.events}
        onClose={closeEventSheet}
        onSave={(event) => {
          dispatch({ type: 'event/upsert', event });
          closeEventSheet();
          toast(existing ? '活动已更新' : '安排好了，记得告诉家人');
        }}
        onDelete={(event) => {
          dispatch({ type: 'event/delete', id: event.id });
          closeEventSheet();
          toast('活动已取消', 'info');
        }}
      />
    </Sheet>
  );
}

function EventForm({
  existing,
  prefill,
  members,
  events,
  onClose,
  onSave,
  onDelete,
}: {
  existing: FamilyEvent | null;
  prefill?: EventPrefill;
  members: ReturnType<typeof activeMembers>;
  events: FamilyEvent[];
  onClose: () => void;
  onSave: (event: FamilyEvent) => void;
  onDelete: (event: FamilyEvent) => void;
}) {
  const defaultAllDay = existing?.allDay ?? prefill?.allDay ?? false;
  const fallbackStart = prefill?.date
    ? toDateTime(dateInputValue(prefill.date), prefill.startTime ?? '10:00')
    : nextHour();
  const initialStart = existing ? parseISO(existing.start) : fallbackStart;
  let initialEnd = existing
    ? parseISO(existing.end)
    : prefill?.date && prefill.endTime
      ? toDateTime(dateInputValue(prefill.date), prefill.endTime)
      : new Date(initialStart.getTime() + 2 * 60 * 60 * 1000);
  if (!existing && !defaultAllDay && initialEnd.getTime() <= initialStart.getTime()) {
    initialEnd = addDays(initialEnd, 1);
  }

  const initialEndDay =
    defaultAllDay && initialEnd.getHours() === 0 && initialEnd.getMinutes() === 0
      ? subDays(startOfDay(initialEnd), 1)
      : initialEnd;

  const [kind, setKind] = useState<EventKind>((existing?.kind ?? prefill?.kind ?? 'outing') as EventKind);
  const [title, setTitle] = useState(existing?.title ?? prefill?.title ?? '');
  const [allDay, setAllDay] = useState(defaultAllDay);
  const [startDate, setStartDate] = useState(
    dateInputValue(existing?.allDay ? startOfDay(initialStart) : initialStart),
  );
  const [endDate, setEndDate] = useState(
    dateInputValue(defaultAllDay ? initialEndDay : initialEnd),
  );
  const [startTime, setStartTime] = useState(
    timeInputValue(existing?.allDay ? new Date(2020, 0, 1, 10, 0) : initialStart),
  );
  const [endTime, setEndTime] = useState(
    timeInputValue(existing?.allDay ? new Date(2020, 0, 1, 12, 0) : initialEnd),
  );
  const [selected, setSelected] = useState<string[]>(() => {
    const proposed = existing
      ? existing.memberIds.length === 0
        ? members.map((member) => member.id)
        : existing.memberIds
      : prefill?.memberIds ?? members.map((member) => member.id);
    const valid = proposed.filter((id) => members.some((member) => member.id === id));
    return valid.length > 0 ? valid : members.map((member) => member.id);
  });
  const [location, setLocation] = useState(existing?.location ?? prefill?.location ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const allSelected = selected.length === members.length;
  const memberIds = allSelected ? [] : selected;

  const start = useMemo(() => {
    if (allDay) return startOfDay(toDateTime(startDate, '00:00'));
    return toDateTime(startDate, startTime);
  }, [allDay, startDate, startTime]);

  const end = useMemo(() => {
    if (allDay) return addDays(startOfDay(toDateTime(endDate, '00:00')), 1);
    return toDateTime(endDate, endTime);
  }, [allDay, endDate, endTime]);

  const rangeValid = end.getTime() > start.getTime();
  const conflicts = useMemo(() => {
    if (!rangeValid) return [];
    return findConflicts(
      { id: existing?.id, start: iso(start), end: iso(end), memberIds },
      events,
    );
  }, [start, end, memberIds, existing?.id, rangeValid, events]);

  const durationMinutes = (end.getTime() - start.getTime()) / 60_000;
  const canSave = title.trim().length > 0 && rangeValid;

  const toggleMember = (id: string) => {
    setSelected((current) => {
      if (current.includes(id)) {
        if (current.length === 1) return current;
        return current.filter((value) => value !== id);
      }
      return [...current, id];
    });
  };

  const save = () => {
    if (!canSave) return;
    const stamp = new Date().toISOString();
    onSave({
      id: existing?.id ?? uid('ev'),
      title: title.trim(),
      kind,
      start: iso(start),
      end: iso(end),
      allDay,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
      memberIds,
      createdAt: existing?.createdAt ?? stamp,
      updatedAt: stamp,
    });
  };

  return (
    <div className="event-form">
      <div className="field">
        <span className="field-label">是什么</span>
        <div className="kind-grid" role="group" aria-label="活动类型">
          {EVENT_KINDS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`kind-option ${kind === item.id ? 'is-active' : ''}`}
              style={{ '--kind': item.color } as CSSProperties}
              onClick={() => setKind(item.id)}
              aria-pressed={kind === item.id}
            >
              <span className="kind-emoji" aria-hidden="true">{item.emoji}</span>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span className="field-label">标题</span>
        <input
          className="input input--title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="比如：溪边露营 / 外婆生日"
          maxLength={48}
          data-autofocus
        />
      </label>

      <div className="field">
        <div className="field-row">
          <span className="field-label">时间</span>
          <button
            type="button"
            className={`switch ${allDay ? 'is-on' : ''}`}
            role="switch"
            aria-checked={allDay}
            onClick={() => setAllDay((value) => !value)}
          >
            <span className="switch-knob" aria-hidden="true" />
            全天
          </button>
        </div>
        <div className="date-range">
          <div className="date-block">
            <span className="date-block-label">开始</span>
            <input
              className="input"
              type="date"
              value={startDate}
              onChange={(event) => {
                const value = event.target.value;
                setStartDate(value);
                if (value > endDate) setEndDate(value);
              }}
            />
            {!allDay && (
              <input
                className="input"
                type="time"
                step={900}
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                aria-label="开始时间"
              />
            )}
          </div>
          <span className="date-arrow" aria-hidden="true">→</span>
          <div className="date-block">
            <span className="date-block-label">结束</span>
            <input
              className="input"
              type="date"
              value={endDate}
              min={startDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
            {!allDay && (
              <input
                className="input"
                type="time"
                step={900}
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                aria-label="结束时间"
              />
            )}
          </div>
        </div>
        <div className="duration-hint">
          {rangeValid
            ? allDay
              ? `${Math.max(1, Math.round(durationMinutes / 1440))} 天 · 全天`
              : formatDuration(durationMinutes)
            : '结束时间要晚于开始时间'}
        </div>
      </div>

      <div className="field">
        <div className="field-row">
          <span className="field-label">谁参加</span>
          {allSelected ? (
            <span className="field-hint">全家都去</span>
          ) : (
            <button
              type="button"
              className="text-button"
              onClick={() => setSelected(members.map((member) => member.id))}
            >
              选择全家
            </button>
          )}
        </div>
        <div className="participant-grid" role="group" aria-label="选择参与者">
          {members.map((member) => {
            const active = selected.includes(member.id);
            return (
              <button
                key={member.id}
                type="button"
                className={`participant-chip ${active ? 'is-active' : ''}`}
                onClick={() => toggleMember(member.id)}
                aria-pressed={active}
              >
                <Avatar member={member} size="xs" />
                {member.name}
              </button>
            );
          })}
        </div>
        {allSelected && <p className="field-hint">不单独选人，就默认全家都参加。</p>}
      </div>

      <div className="field-row-two">
        <label className="field">
          <span className="field-label">地点（可选）</span>
          <input
            className="input"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="青岚溪谷"
            maxLength={60}
          />
        </label>
        <label className="field">
          <span className="field-label">备注（可选）</span>
          <input
            className="input"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="带帐篷和防蚊液"
            maxLength={120}
          />
        </label>
      </div>

      {conflicts.length > 0 && (
        <div className="conflict-card" role="status">
          <strong>这段时间有 {conflicts.length} 个活动重叠</strong>
          {conflicts.slice(0, 2).map((conflict) => (
            <span key={conflict.event.id}>
              「{conflict.event.title}」重叠 {formatDuration(conflict.overlapMinutes)}
            </span>
          ))}
          <em>可以仍然安排，或者回去改个时间。</em>
        </div>
      )}

      <div className="footer-split event-form-footer">
        {existing ? (
          confirmDelete ? (
            <span className="inline-confirm">
              会从日历里移除，确定吗？
              <button type="button" className="text-button text-button--danger" onClick={() => onDelete(existing)}>
                删除
              </button>
              <button type="button" className="text-button" onClick={() => setConfirmDelete(false)}>
                取消
              </button>
            </span>
          ) : (
            <button type="button" className="text-button text-button--danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={15} strokeWidth={2.3} /> 删除活动
            </button>
          )
        ) : (
          <span className="event-form-note">先填标题和时间，其他都可以之后补。</span>
        )}
        <div className="event-form-actions">
          <button type="button" className="button button--ghost" onClick={onClose}>
            取消
          </button>
          <button type="button" className="button button--primary" onClick={save} disabled={!canSave}>
            <Sparkles size={16} strokeWidth={2.4} />
            {existing ? '保存修改' : '放进日历'}
          </button>
        </div>
      </div>
    </div>
  );
}

function nextHour(): Date {
  const next = new Date();
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  return next;
}
