import { ArrowRight, CalendarPlus, Sparkles, Users } from 'lucide-react';
import { addDays } from 'date-fns';
import {
  formatCountdown,
  formatDuration,
  formatEventWhen,
  formatMonthDay,
  formatTime,
  greeting,
  weekdayIndex,
  WEEKDAY_FULL,
  weekDays,
} from '../lib/dates';
import type { CommonWindow } from '../lib/availability';
import { kindMeta } from '../lib/types';
import {
  activeMembers,
  bestWindows,
  eventsForDay,
  nextCommonWindow,
  nextHighlight,
  parents,
} from '../lib/selectors';
import { useFamily } from '../state/FamilyContext';
import { useUI } from '../state/UIContext';
import { AvatarStack } from '../components/Avatar';
import { Doodle } from '../components/Brand';
import { EmptyState, SectionHead } from '../components/Bits';
import { Timeline } from '../components/Timeline';
import { stickerFor } from '../lib/stickers';

export function TodayScreen() {
  const { state } = useFamily();
  const { go, openCreate, openEdit } = useUI();
  const now = new Date();
  const todayEvents = eventsForDay(state, now);
  const highlight = nextHighlight(state, now);
  const parentMembers = parents(state);
  const parentIds = parentMembers.map((member) => member.id);
  const sharedWindow = parentIds.length >= 2 ? nextCommonWindow(state, parentIds, now) : null;
  const members = activeMembers(state);
  const week = weekDays(now);
  const weekEventCount = week.reduce((sum, day) => sum + eventsForDay(state, day).length, 0);
  const thisWeekSlots = parentIds.length >= 2 ? bestWindows(state, parentIds, 12, 7).length : 0;
  const highlightMembers = highlight
    ? members.filter((member) => highlight.memberIds.length === 0 || highlight.memberIds.includes(member.id))
    : [];
  const highlightAllFamily = Boolean(
    highlight &&
      (highlight.memberIds.length === 0 ||
        members.every((member) => highlight.memberIds.includes(member.id))),
  );

  return (
    <div className="page today-page">
      <section className="hero">
        <span className="hero-blob" aria-hidden="true" />
        <div className="hero-copy">
          <span className="eyebrow eyebrow--strong">
            {WEEKDAY_FULL[weekdayIndex(now)]} · {formatMonthDay(now)}
          </span>
          <h1>
            {greeting(now)}，<br />
            <span className="hero-family">{state.familyName}</span>
            <Doodle variant="star" className="hero-spark" />
          </h1>
          <p className="hero-sub">
            {todayEvents.length > 0
              ? `今天有 ${todayEvents.length} 件小事，慢慢来。`
              : '今天留白，正好去公园走走。'}
          </p>
          <div className="hero-actions">
            <button type="button" className="button button--primary" onClick={() => openCreate({ date: now })}>
              <CalendarPlus size={17} strokeWidth={2.5} />
              安排一件事
            </button>
            <button type="button" className="button button--ghost" onClick={() => go('together')}>
              找共同空闲
              <ArrowRight size={16} strokeWidth={2.4} />
            </button>
          </div>
          <div className="hero-meta">
            <span>{weekEventCount} 个本周活动</span>
            <span className="meta-sep" aria-hidden="true" />
            <span>{thisWeekSlots} 段合拍空档</span>
            {state.isSample && (
              <button type="button" className="hero-sample" onClick={() => go('settings')}>
                示例家庭 · 换成我家
              </button>
            )}
          </div>
        </div>

        <div className="hero-art">
          {highlight ? (
            <button type="button" className="highlight-card" onClick={() => openEdit(highlight.id)}>
              <span className="highlight-label">
                <Sparkles size={14} strokeWidth={2.4} /> 下一件值得期待的事
              </span>
              <span
                className="highlight-emoji"
                style={{ background: kindMeta(highlight.kind).color }}
                aria-hidden="true"
              >
                {state.stickerMode ? stickerFor(highlight, kindMeta(highlight.kind).emoji) : kindMeta(highlight.kind).emoji}
              </span>
              <span className="highlight-title">{highlight.title}</span>
              <span className="highlight-when">{formatEventWhen(highlight, now)}</span>
              <span className="highlight-foot">
                <span className="highlight-countdown">{formatCountdown(highlight, now)}</span>
                {highlightAllFamily ? (
                  <span className="event-family">
                    <Users size={13} strokeWidth={2.2} aria-hidden="true" />
                    全家
                  </span>
                ) : (
                  <AvatarStack members={highlightMembers} size="xs" max={3} />
                )}
              </span>
            </button>
          ) : (
            <div className="highlight-card highlight-card--empty">
              <span className="highlight-label">日历还很空</span>
              <span className="highlight-title">计划一次小出走</span>
              <p>周末去河边，或者只是楼下的冰淇淋。</p>
              <button type="button" className="button button--soft" onClick={() => openCreate({ date: addDays(now, 2) })}>
                开始计划
              </button>
            </div>
          )}
        </div>
      </section>

      <div className="today-grid">
        <section className="panel panel--timeline">
          <SectionHead
            title={todayEvents.length > 0 ? '今天的时间线' : '今天，留白'}
            action={
              <button type="button" className="icon-button" onClick={() => openCreate({ date: now })} aria-label="添加今天的活动">
                <CalendarPlus size={19} strokeWidth={2.3} />
              </button>
            }
          />
          {todayEvents.length > 0 ? (
            <Timeline events={todayEvents} day={now} onEventClick={openEdit} />
          ) : (
            <EmptyState
              title="今天没有安排"
              description="空白也是行程的一部分。要不要留一点给临时起意？"
              actionLabel="加一件小事"
              onAction={() => openCreate({ date: now })}
            />
          )}
        </section>

        <aside className="today-side">
          <SharedWindowCard window={sharedWindow} parents={parentMembers} onOpen={() => go('together')} />
        </aside>
      </div>
    </div>
  );
}

function SharedWindowCard({
  window,
  parents,
  onOpen,
}: {
  window: CommonWindow | null;
  parents: ReturnType<typeof activeMembers>;
  onOpen: () => void;
}) {
  return (
    <section className="panel shared-card">
      <h2>合拍时刻</h2>
      {window ? (
        <>
          <p className="shared-when">
            {formatMonthDay(new Date(window.start))} · {WEEKDAY_FULL[weekdayIndex(new Date(window.start))]}
          </p>
          <p className="shared-time">
            {formatTime(new Date(window.start))} – {formatTime(new Date(window.end))}
          </p>
          <p className="shared-duration">
            {parents.map((parent) => parent.name).join(' 和 ')} 都有 {formatDuration(window.durationMin)}
          </p>
          <div className="shared-foot">
            <AvatarStack members={parents} size="sm" />
            <button type="button" className="button button--primary button--small" onClick={onOpen}>
              安排一下
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="shared-empty">还没有找到共同的空档。</p>
          <button type="button" className="button button--soft button--small" onClick={onOpen}>
            去合拍看看
          </button>
        </>
      )}
    </section>
  );
}
