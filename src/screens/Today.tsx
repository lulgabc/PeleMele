import { ArrowRight, CalendarPlus, Sparkles } from 'lucide-react';
import { addDays } from 'date-fns';
import {
  formatCountdown,
  formatDuration,
  formatEventWhen,
  formatMonthDay,
  formatTime,
  formatWeekRange,
  greeting,
  weekdayIndex,
  WEEKDAY_FULL,
  WEEKDAY_MON,
  weekDays,
  isToday,
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

export function TodayScreen() {
  const { state, dispatch } = useFamily();
  const { go, openCreate, openEdit, selectWeekDay } = useUI();
  const now = new Date();
  const todayEvents = eventsForDay(state, now);
  const highlight = nextHighlight(state, now);
  const parentMembers = parents(state);
  const parentIds = parentMembers.map((member) => member.id);
  const sharedWindow = parentIds.length >= 2 ? nextCommonWindow(state, parentIds, now) : null;
  const members = activeMembers(state);
  const week = weekDays(now);
  const weekEventCount = week.reduce((sum, day) => sum + eventsForDay(state, day).length, 0);
  const thisWeekSlots = parentIds.length >= 2 ? bestWindows({ ...state }, parentIds, 12, 7).length : 0;

  return (
    <div className="page today-page">
      {!state.onboardingSeen && (
        <div className="onboarding-strip">
          <span className="onboarding-emoji" aria-hidden="true">🌈</span>
          <p>
            这里是小满一家的示例日程。换成你家的名字和成员，只要一分钟。
          </p>
          <div className="onboarding-actions">
            <button type="button" className="text-button" onClick={() => go('settings')}>
              去设置
            </button>
            <button
              type="button"
              className="text-button text-button--quiet"
              onClick={() => dispatch({ type: 'onboarding/seen' })}
            >
              先用示例
            </button>
          </div>
        </div>
      )}

      <section className="hero">
        <span className="hero-blob hero-blob-a" aria-hidden="true" />
        <span className="hero-blob hero-blob-b" aria-hidden="true" />
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
            {sharedWindow ? ' 本周有一段完整的合拍空档。' : ''}
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
          <div className="hero-stats">
            <span>
              <strong>{weekEventCount}</strong> 个本周活动
            </span>
            <span>
              <strong>{thisWeekSlots}</strong> 段合拍空档
            </span>
            <span>
              <strong>{members.length}</strong> 位家人
            </span>
          </div>
        </div>

        <div className="hero-art">
          {highlight ? (
            <button type="button" className="highlight-card" onClick={() => openEdit(highlight.id)}>
              <span className="highlight-pin" aria-hidden="true" />
              <span className="highlight-label">
                <Sparkles size={14} strokeWidth={2.4} /> 下一件值得期待的事
              </span>
              <span
                className="highlight-emoji"
                style={{ background: kindMeta(highlight.kind).color }}
                aria-hidden="true"
              >
                {kindMeta(highlight.kind).emoji}
              </span>
              <span className="highlight-title">{highlight.title}</span>
              <span className="highlight-when">{formatEventWhen(highlight, now)}</span>
              <span className="highlight-foot">
                <span className="highlight-countdown">{formatCountdown(highlight, now)}</span>
                <AvatarStack
                  members={members.filter(
                    (member) =>
                      highlight.memberIds.length === 0 || highlight.memberIds.includes(member.id),
                  )}
                  size="xs"
                />
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
          <Doodle variant="squiggle" className="hero-squiggle" />
        </div>
      </section>

      <div className="today-grid">
        <section className="panel panel--timeline">
          <SectionHead
            eyebrow="TODAY"
            title={todayEvents.length > 0 ? `今天的时间线` : '今天，留白'}
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
          <div className="panel week-peek-panel">
            <SectionHead
              eyebrow="THIS WEEK"
              title="这一周"
              action={
                <button type="button" className="text-button" onClick={() => go('week')}>
                  展开 <ArrowRight size={14} strokeWidth={2.4} />
                </button>
              }
            />
            <div className="week-peek">
              {week.map((day) => {
                const dayEvents = eventsForDay(state, day);
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    className={`peek-day ${isToday(day) ? 'is-today' : ''}`}
                    onClick={() => {
                      selectWeekDay(day);
                      go('week');
                    }}
                    aria-label={`${formatMonthDay(day)}，${dayEvents.length} 个活动`}
                  >
                    <span className="peek-weekday">{WEEKDAY_MON[weekdayIndex(day)]}</span>
                    <strong>{day.getDate()}</strong>
                    <span className="peek-dots" aria-hidden="true">
                      {dayEvents.slice(0, 3).map((event) => (
                        <i key={event.id} style={{ background: kindMeta(event.kind).color }} />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="week-peek-note">
              {formatWeekRange(now)} · 共 {weekEventCount} 个活动
            </p>
          </div>
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
}) {  return (
    <section className="panel shared-card">
      <div className="shared-rings" aria-hidden="true">
        <span />
        <span />
      </div>
      <span className="eyebrow">TOGETHER</span>
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
          <p className="shared-empty">还没有找到爸爸妈妈共同的空档。</p>
          <button type="button" className="button button--soft button--small" onClick={onOpen}>
            去合拍看看
          </button>
        </>
      )}
    </section>
  );
}
