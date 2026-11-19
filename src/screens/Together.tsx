import { useMemo, useState } from 'react';
import { addDays, startOfDay } from 'date-fns';
import { Check, CloudOff, Link2, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import {
  formatDuration,
  formatMonthDay,
  formatTime,
  relativeDayLabel,
  weekdayIndex,
  WEEKDAY_FULL,
  upcomingDays,
} from '../lib/dates';
import {
  activeEvents,
  activeMembers,
  buildBusyMap,
  eventsForDay,
  parents,
} from '../lib/selectors';
import { findCommonWindows, getDayAvailability, rankWindows, type CommonWindow } from '../lib/availability';
import { fetchGoogleBusy, getValidToken, requestGoogleToken } from '../lib/google';
import { useFamily } from '../state/FamilyContext';
import { useUI } from '../state/UIContext';
import { Avatar, AvatarStack } from '../components/Avatar';
import { EmptyState, SectionHead } from '../components/Bits';
import { Doodle } from '../components/Brand';

const WINDOWS = [
  { id: 'all', label: '弹性', start: 8, end: 22 },
  { id: 'evening', label: '晚上', start: 18, end: 22 },
  { id: 'day', label: '白天', start: 9, end: 18 },
] as const;

const DURATIONS = [60, 90, 120] as const;

export function TogetherScreen() {
  const { state, dispatch } = useFamily();
  const { openCreate, go, toast } = useUI();
  const allMembers = activeMembers(state);
  const parentMembers = parents(state);
  const parentIds = parentMembers.map((member) => member.id);
  const [selectedIds, setSelectedIds] = useState<string[]>(parentIds);
  const [windowId, setWindowId] = useState<(typeof WINDOWS)[number]['id']>('all');
  const [minDuration, setMinDuration] = useState<(typeof DURATIONS)[number]>(90);
  const [syncing, setSyncing] = useState(false);

  const validSelected = selectedIds.filter((id) => allMembers.some((member) => member.id === id));
  const selected = validSelected.length > 0 ? validSelected : parentIds;
  const selectedMembers = allMembers.filter((member) => selected.includes(member.id));
  const presets = WINDOWS.find((item) => item.id === windowId) ?? WINDOWS[0];
  const now = new Date();
  const rangeStart = startOfDay(now);
  const rangeEnd = addDays(rangeStart, 6);
  const selectedKey = selected.join(',');

  const { busyByMember, sourceByMember } = useMemo(
    () => buildBusyMap(state, selected, rangeStart, rangeEnd),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, selectedKey, rangeStart.getTime()],
  );

  const windows = useMemo(
    () =>
      findCommonWindows({
        rangeStart,
        rangeEnd,
        memberIds: selected,
        busyByMember,
        events: activeEvents(state),
        windowStartHour: presets.start,
        windowEndHour: presets.end,
        minMinutes: minDuration,
        adaptiveWeekday: windowId === 'all',
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busyByMember, state, selectedKey, presets.start, presets.end, minDuration, rangeStart.getTime(), windowId],
  );

  const best = useMemo(
    () => rankWindows(windows, now, 3).sort((a, b) => a.start - b.start),
    [windows, now],
  );
  const days = upcomingDays(now, 7);
  const hasDemo = Object.values(sourceByMember).includes('demo');
  const hasGoogle = Object.values(sourceByMember).includes('google');
  const googleMembers = selected.filter((id) => sourceByMember[id] === 'google');

  const toggleMember = (id: string) => {
    setSelectedIds((current) => {
      const base = current.filter((value) => allMembers.some((member) => member.id === value));
      if (base.includes(id)) {
        if (base.length === 1) return base;
        return base.filter((value) => value !== id);
      }
      return [...base, id];
    });
  };

  const createFromWindow = (window: CommonWindow) => {
    const start = new Date(window.start);
    const end = new Date(window.end);
    openCreate({
      date: start,
      startTime: formatTime(start),
      endTime: formatTime(end),
      title: '合拍时光',
      kind: 'outing',
      memberIds: selected,
    });
  };

  const openGoogleSettings = () => {
    go('settings');
    window.setTimeout(() => {
      document.getElementById('google')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 220);
  };

  async function refreshGoogle() {
    if (!state.google.clientId) {
      toast('在设置里填入 Google Client ID 后就能同步', 'info');
      openGoogleSettings();
      return;
    }
    const memberId = state.google.connectedMemberId ?? parentIds[0];
    if (!memberId) return;
    try {
      setSyncing(true);
      let token = getValidToken();
      if (!token) token = await requestGoogleToken(state.google.clientId, true);
      const calendarId = state.google.calendars[memberId] ?? 'primary';
      const blocks = await fetchGoogleBusy(token.accessToken, [{ memberId, calendarId }], rangeStart, addDays(rangeStart, 21));
      dispatch({
        type: 'google/busy',
        memberId,
        blocks,
        rangeStart: rangeStart.toISOString(),
        rangeEnd: addDays(rangeStart, 21).toISOString(),
        account: null,
      });
      toast(`已同步 ${blocks.length} 段忙碌时间`);
    } catch (error) {
      toast(error instanceof Error ? error.message : '同步失败，请稍后再试', 'error');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="page together-page">
      <div className="page-head">
        <div>
          <span className="eyebrow">TOGETHER</span>
          <h1>找到合拍的时刻</h1>
          <p className="page-sub">把两个人（或全家人）的空档叠在一起，剩下的就是可以出发的时间。</p>
        </div>
        <button type="button" className="button button--primary" onClick={() => go('week')}>
          <Sparkles size={17} strokeWidth={2.4} /> 看看这一周
        </button>
      </div>

      <section className="overlap-hero">
        <div className="overlap-art" aria-hidden="true">
          <span className="overlap-circle overlap-circle--a" />
          <span className="overlap-circle overlap-circle--b" />
          <span className="overlap-heart">♥</span>
        </div>
        <div className="overlap-copy">
          <span className="eyebrow">THE SWEET SPOT</span>
          <h2>重叠的部分，<br />就是一起出发的时间。</h2>
          <p>
            已选择 {selectedMembers.length} 位家人
            {hasGoogle ? '，含 Google 日历的忙碌时段' : ''}
            {hasDemo ? '（当前有示例数据）' : ''}。
          </p>
          <div className="overlap-members">
            <AvatarStack members={selectedMembers} size="md" />
            <div className="member-toggle-row" role="group" aria-label="选择要比较的家人">
              {allMembers.map((member) => {
                const active = selected.includes(member.id);
                return (
                  <button
                    key={member.id}
                    type="button"
                    className={`member-chip ${active ? 'is-active' : ''}`}
                    onClick={() => toggleMember(member.id)}
                    aria-pressed={active}
                  >
                    <Avatar member={member} size="xs" />
                    {member.name}
                    {active && <Check size={13} strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <Doodle variant="squiggle" className="overlap-squiggle" />
      </section>

      <div className="together-controls panel">
        <div className="control-group">
          <span className="control-label">可安排的时间</span>
          <div className="segmented" role="group" aria-label="可安排的时间段">
            {WINDOWS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={windowId === preset.id ? 'is-active' : ''}
                onClick={() => setWindowId(preset.id)}
                aria-pressed={windowId === preset.id}
              >
                {preset.label}
                <small>{preset.id === 'all' ? '工作日晚上' : `${String(preset.start).padStart(2, '0')}–${String(preset.end).padStart(2, '0')}`}</small>
              </button>
            ))}
          </div>
        </div>
        <div className="control-group">
          <span className="control-label">至少留出</span>
          <div className="segmented" role="group" aria-label="最短空闲时长">
            {DURATIONS.map((duration) => (
              <button
                key={duration}
                type="button"
                className={minDuration === duration ? 'is-active' : ''}
                onClick={() => setMinDuration(duration)}
                aria-pressed={minDuration === duration}
              >
                {duration} 分钟
              </button>
            ))}
          </div>
        </div>
        <div className="control-legend">
          <span><i className="legend-busy" aria-hidden="true" /> 忙碌</span>
          <span><i className="legend-free" aria-hidden="true" /> 共同空闲</span>
        </div>
      </div>

      <div className={`google-bar ${hasGoogle ? 'has-google' : ''}`}>
        <span className="google-icon" aria-hidden="true">
          {hasGoogle ? <Link2 size={18} strokeWidth={2.2} /> : <CloudOff size={18} strokeWidth={2.2} />}
        </span>
        <div className="google-bar-copy">
          <strong>
            {hasGoogle
              ? `已连接 Google 日历 · ${googleMembers.map((id) => allMembers.find((member) => member.id === id)?.name).join('、')}${hasDemo ? ' · 其他成员使用示例' : ''}`
              : state.google.demoBusy
                ? '正在使用示例忙碌数据'
                : '还没有父母的忙碌数据'}
          </strong>
          <span>
            {hasGoogle
              ? `最近同步 ${state.google.lastSyncAt ? new Date(state.google.lastSyncAt).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '刚刚'} · 只读取忙碌/空闲，不读取事件标题`
              : '连接 Google 后，用真实的忙碌时间寻找共同空档。示例数据只为让你先体验。'}
          </span>
        </div>
        <div className="google-bar-actions">
          {!hasGoogle && (
            <button
              type="button"
              className={`switch ${state.google.demoBusy ? 'is-on' : ''}`}
              role="switch"
              aria-checked={state.google.demoBusy}
              onClick={() =>
                dispatch({ type: 'settings/google', patch: { demoBusy: !state.google.demoBusy } })
              }
            >
              <span className="switch-knob" aria-hidden="true" />
              示例
            </button>
          )}
          {hasGoogle ? (
            <button type="button" className="button button--soft button--small" onClick={refreshGoogle} disabled={syncing}>
              <RefreshCw size={15} strokeWidth={2.4} className={syncing ? 'is-spinning' : ''} />
              {syncing ? '同步中…' : '刷新'}
            </button>
          ) : (
            <button type="button" className="button button--soft button--small" onClick={openGoogleSettings}>
              <Link2 size={15} strokeWidth={2.4} /> 连接 Google
            </button>
          )}
        </div>
      </div>

      {hasDemo && (
        <p className="demo-note">
          <ShieldCheck size={14} strokeWidth={2.2} />
          {hasGoogle ? '部分成员的忙碌时段来自示例数据' : '示例数据是本地生成的，不会上传'}；随时可以在设置里关闭。
        </p>
      )}

      <section className="best-section">
        <SectionHead eyebrow="BEST PICKS" title="最值得约的时段" />
        {best.length > 0 ? (
          <div className="best-grid">
            {best.map((window, index) => {
              const start = new Date(window.start);
              return (
                <article key={window.start} className={`best-card ${index === 0 ? 'is-featured' : ''}`}>
                  <span className="best-rank">{String(index + 1).padStart(2, '0')}</span>
                  <div className="best-date">
                    <span>{WEEKDAY_FULL[weekdayIndex(start)]}</span>
                    <strong>{start.getDate()}</strong>
                    <small>{start.getMonth() + 1} 月</small>
                  </div>
                  <div className="best-copy">
                    <span className="best-time">
                      {formatTime(start)} – {formatTime(new Date(window.end))}
                    </span>
                    <span className="best-duration">{formatDuration(window.durationMin)} 的完整空档</span>
                    <AvatarStack members={selectedMembers} size="xs" />
                  </div>
                  <button type="button" className="button button--primary button--small" onClick={() => createFromWindow(window)}>
                    就这个
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="未来 7 天没有够长的合拍空档"
            description="把“至少留出”调短一点，或先看看晚上和周末。"
            actionLabel="看看 60 分钟的空档"
            onAction={() => setMinDuration(60)}
          />
        )}
      </section>

      <section className="ribbon-section">
        <SectionHead eyebrow="SEVEN DAYS" title="未来 7 天的空档" />
        <div className="ribbon-list">
          {days.map((day) => {
            const availability = getDayAvailability(day, {
              memberIds: selected,
              busyByMember,
              events: activeEvents(state),
              windowStartHour: presets.start,
              windowEndHour: presets.end,
              minMinutes: 15,
              adaptiveWeekday: windowId === 'all',
            });
            const span = availability.end - availability.start;
            const dayWindows = windows.filter(
              (window) => new Date(window.start).toDateString() === day.toDateString(),
            );
            const freeSegments = availability.free.filter((segment) => (segment.end - segment.start) / 60_000 >= 15);
            const percent = (time: number) => ((time - availability.start) / span) * 100;
            const dayEvents = eventsForDay(state, day);
            return (
              <div className="ribbon-row" key={day.toISOString()}>
                <div className={`ribbon-day ${relativeDayLabel(day) === '今天' ? 'is-today' : ''}`}>
                  <span>{WEEKDAY_FULL[weekdayIndex(day)]}</span>
                  <strong>{day.getDate()}</strong>
                  <small>{relativeDayLabel(day)} · {dayEvents.length} 件</small>
                </div>
                <div className="ribbon-main">
                  <div className="ribbon" role="img" aria-label={`${formatMonthDay(day)}的空闲分布`}>
                    <div className="ribbon-track" />
                    {availability.busy.map((block, blockIndex) => (
                      <span
                        key={`busy-${blockIndex}`}
                        className="ribbon-busy"
                        style={{
                          left: `${percent(block.start)}%`,
                          width: `${Math.max(0.8, percent(block.end) - percent(block.start))}%`,
                        }}
                        title="忙碌"
                      />
                    ))}
                    {freeSegments.map((segment) => {
                      const width = percent(segment.end) - percent(segment.start);
                      const duration = (segment.end - segment.start) / 60_000;
                      return (
                        <button
                          key={segment.start}
                          type="button"
                          className="ribbon-free"
                          style={{ left: `${percent(segment.start)}%`, width: `${Math.max(1.2, width)}%` }}
                          onClick={() =>
                            openCreate({
                              date: new Date(segment.start),
                              startTime: formatTime(new Date(segment.start)),
                              endTime: formatTime(new Date(segment.end)),
                              title: '一起做点什么',
                              kind: 'outing',
                              memberIds: selected,
                            })
                          }
                          aria-label={`${formatMonthDay(day)} ${formatTime(new Date(segment.start))} 到 ${formatTime(
                            new Date(segment.end),
                          )}，共同空闲 ${formatDuration(duration)}`}
                        >
                          {width > 16 && <span>{formatDuration(duration)}</span>}
                        </button>
                      );
                    })}
                  </div>
                  <div className="ribbon-ticks" aria-hidden="true">
                    <span>{formatTime(new Date(availability.start))}</span>
                    <span>{formatTime(new Date((availability.start + availability.end) / 2))}</span>
                    <span>{formatTime(new Date(availability.end))}</span>
                  </div>
                  {dayWindows.length > 0 && (
                    <div className="ribbon-actions">
                      {dayWindows.slice(0, 2).map((window) => (
                        <button
                          key={window.start}
                          type="button"
                          className="slot-chip"
                          onClick={() => createFromWindow(window)}
                        >
                          <span>
                            {formatTime(new Date(window.start))}–{formatTime(new Date(window.end))}
                          </span>
                          {formatDuration(window.durationMin)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <p className="privacy-note">
        <ShieldCheck size={15} strokeWidth={2.2} />
        PeleMele 只读取 Google 日历的忙碌/空闲区间，不读取事件标题、地点或参与者。数据默认只存在你的设备上。
      </p>
    </div>
  );
}
