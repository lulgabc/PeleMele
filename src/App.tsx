import { TopBar, Dock } from './components/Nav';
import { ToastViewport } from './components/Toasts';
import { DaySheet } from './screens/DaySheet';
import { EventSheet } from './screens/EventSheet';
import { MonthScreen } from './screens/Month';
import { SettingsScreen } from './screens/Settings';
import { TogetherScreen } from './screens/Together';
import { TodayScreen } from './screens/Today';
import { WeekScreen } from './screens/Week';
import { SyncBridge } from './state/SyncBridge';
import { useUI } from './state/UIContext';

export default function App() {
  const { view } = useUI();

  return (
    <div className={`app app--${view}`}>
      {view !== 'settings' && <TopBar />}
      <main className="app-main">
        {view === 'today' && <TodayScreen />}
        {view === 'week' && <WeekScreen />}
        {view === 'month' && <MonthScreen />}
        {view === 'together' && <TogetherScreen />}
        {view === 'settings' && <SettingsScreen />}
      </main>

      <Dock />
      <EventSheet />
      <DaySheet />
      <ToastViewport />
      <SyncBridge />
    </div>
  );
}
