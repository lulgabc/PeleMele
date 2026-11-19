import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { startOfDay, startOfMonth } from 'date-fns';
import type { EventKind } from '../lib/types';

export type View = 'today' | 'week' | 'month' | 'together' | 'settings';

export interface EventPrefill {
  title?: string;
  kind?: EventKind;
  sticker?: string;
  date?: Date;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  location?: string;
  memberIds?: string[];
}

export interface EventSheetState {
  mode: 'create' | 'edit';
  eventId?: string;
  prefill?: EventPrefill;
}

export interface ToastItem {
  id: number;
  message: string;
  tone: 'success' | 'error' | 'info';
}

interface UIContextValue {
  view: View;
  go: (view: View) => void;
  settingsReturn: View;
  weekAnchor: Date;
  setWeekAnchor: (date: Date) => void;
  weekDay: Date;
  selectWeekDay: (date: Date) => void;
  monthAnchor: Date;
  setMonthAnchor: (date: Date) => void;
  daySheet: Date | null;
  openDay: (date: Date) => void;
  closeDay: () => void;
  eventSheet: EventSheetState | null;
  openCreate: (prefill?: EventPrefill) => void;
  openEdit: (eventId: string) => void;
  closeEventSheet: () => void;
  toasts: ToastItem[];
  toast: (message: string, tone?: ToastItem['tone']) => void;
  dismissToast: (id: number) => void;
  disableMotion: boolean;
}

const UIContext = createContext<UIContextValue | null>(null);

function parseView(): View {
  if (typeof window === 'undefined') return 'today';
  const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0];
  if (raw === 'week' || raw === 'month' || raw === 'together' || raw === 'settings' || raw === 'today') return raw;
  return 'today';
}

export function UIProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>(parseView);
  const [settingsReturn, setSettingsReturn] = useState<View>('today');
  const viewRef = useRef<View>(view);
  viewRef.current = view;

  const [weekAnchor, setWeekAnchorState] = useState<Date>(() => startOfDay(new Date()));
  const [weekDay, setWeekDay] = useState<Date>(() => startOfDay(new Date()));
  const [monthAnchor, setMonthAnchorState] = useState<Date>(() => startOfMonth(new Date()));
  const [daySheet, setDaySheet] = useState<Date | null>(null);
  const [eventSheet, setEventSheet] = useState<EventSheetState | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [disableMotion, setDisableMotion] = useState(false);
  const toastTimers = useRef<Map<number, number>>(new Map());

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setDisableMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const next = parseView();
      setView(next);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    const timers = toastTimers.current;
    return () => {
      for (const timer of timers.values()) window.clearTimeout(timer);
      timers.clear();
    };
  }, []);

  const go = useCallback((next: View) => {
    if (next === 'settings' && viewRef.current !== 'settings') {
      setSettingsReturn(viewRef.current);
    }
    setView(next);
    const hash = `#/${next}`;
    if (window.location.hash !== hash) window.location.hash = hash;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const setWeekAnchor = useCallback((date: Date) => {
    setWeekAnchorState(startOfDay(date));
  }, []);

  const selectWeekDay = useCallback((date: Date) => {
    setWeekDay(startOfDay(date));
    setWeekAnchorState(startOfDay(date));
  }, []);

  const setMonthAnchor = useCallback((date: Date) => {
    setMonthAnchorState(startOfMonth(date));
  }, []);

  const openDay = useCallback((date: Date) => setDaySheet(startOfDay(date)), []);
  const closeDay = useCallback(() => setDaySheet(null), []);

  const openCreate = useCallback((prefill?: EventPrefill) => {
    setEventSheet({ mode: 'create', prefill });
  }, []);

  const openEdit = useCallback((eventId: string) => {
    setEventSheet({ mode: 'edit', eventId });
  }, []);

  const closeEventSheet = useCallback(() => setEventSheet(null), []);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = toastTimers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      toastTimers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (message: string, tone: ToastItem['tone'] = 'success') => {
      const id = Date.now() + Math.random();
      setToasts((current) => [...current.slice(-2), { id, message, tone }]);
      const timer = window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== id));
        toastTimers.current.delete(id);
      }, 3800);
      toastTimers.current.set(id, timer);
    },
    [],
  );

  const value: UIContextValue = {
    view,
    go,
    settingsReturn,
    weekAnchor,
    setWeekAnchor,
    weekDay,
    selectWeekDay,
    monthAnchor,
    setMonthAnchor,
    daySheet,
    openDay,
    closeDay,
    eventSheet,
    openCreate,
    openEdit,
    closeEventSheet,
    toasts,
    toast,
    dismissToast,
    disableMotion,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI(): UIContextValue {
  const value = useContext(UIContext);
  if (!value) throw new Error('useUI must be used inside UIProvider');
  return value;
}
