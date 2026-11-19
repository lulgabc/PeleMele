import { Flower2, HeartHandshake, Plus, Settings2, Sun, Waves } from 'lucide-react';
import { activeMembers } from '../lib/selectors';
import { useFamily } from '../state/FamilyContext';
import { useUI, type View } from '../state/UIContext';
import { AvatarStack } from './Avatar';
import { BrandLockup } from './Brand';
import { formatMonthDay, WEEKDAY_FULL, weekdayIndex } from '../lib/dates';

const NAV: Array<{ id: View; label: string; icon: typeof Sun }> = [
  { id: 'today', label: '今天', icon: Sun },
  { id: 'week', label: '节奏', icon: Waves },
  { id: 'month', label: '花园', icon: Flower2 },
  { id: 'together', label: '合拍', icon: HeartHandshake },
];

export function TopBar() {
  const { state } = useFamily();
  const { go, view } = useUI();
  const members = activeMembers(state);
  const now = new Date();

  return (
    <header className="topbar">
      <button type="button" className="brand-button" onClick={() => go('today')} aria-label="回到今天">
        <BrandLockup />
      </button>

      <nav className="topnav" aria-label="主导航">
        {NAV.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={`topnav-item ${view === item.id ? 'is-active' : ''}`}
              onClick={() => go(item.id)}
              aria-current={view === item.id ? 'page' : undefined}
            >
              <Icon size={16} strokeWidth={2.3} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="top-meta">
        <span className="date-chip">
          {formatMonthDay(now)} · {WEEKDAY_FULL[weekdayIndex(now)]}
        </span>
        <button
          type="button"
          className="avatar-button"
          onClick={() => go('settings')}
          aria-label="家庭成员与设置"
        >
          <AvatarStack members={members} size="sm" max={4} />
        </button>
        <button
          type="button"
          className="icon-button settings-button"
          onClick={() => go('settings')}
          aria-label="打开设置"
        >
          <Settings2 size={19} strokeWidth={2.2} />
        </button>
      </div>
    </header>
  );
}

export function Dock() {
  const { view, go, openCreate, weekDay, monthAnchor } = useUI();
  if (view === 'settings') return null;

  const today = new Date();
  const addDate =
    view === 'week'
      ? weekDay
      : view === 'month'
        ? monthAnchor.getFullYear() === today.getFullYear() && monthAnchor.getMonth() === today.getMonth()
          ? today
          : new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1)
        : today;

  const renderItem = (item: (typeof NAV)[number]) => {
    const Icon = item.icon;
    const active = view === item.id;
    return (
      <button
        key={item.id}
        type="button"
        className={`dock-item ${active ? 'is-active' : ''}`}
        onClick={() => go(item.id)}
        aria-current={active ? 'page' : undefined}
      >
        <span className="dock-icon">
          <Icon size={21} strokeWidth={active ? 2.5 : 2.1} />
        </span>
        <span className="dock-label">{item.label}</span>
      </button>
    );
  };

  return (
    <nav className="dock" aria-label="底部导航">
      {NAV.slice(0, 2).map(renderItem)}
      <button
        type="button"
        className="dock-add"
        onClick={() => {
          openCreate({ date: addDate });
        }}
        aria-label="添加活动"
      >
        <Plus size={22} strokeWidth={2.7} />
      </button>
      {NAV.slice(2).map(renderItem)}
    </nav>
  );
}
