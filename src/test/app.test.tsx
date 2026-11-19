import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { createSeedState } from '../lib/seed';
import { FamilyProvider } from '../state/FamilyContext';
import { UIProvider } from '../state/UIContext';

function renderApp() {
  window.location.hash = '#/today';
  return render(
    <FamilyProvider initialState={createSeedState(new Date())}>
      <UIProvider>
        <App />
      </UIProvider>
    </FamilyProvider>,
  );
}

describe('PeleMele app', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.location.hash = '#/today';
    vi.useRealTimers();
  });

  it('renders the family poster and today’s story', () => {
    renderApp();
    expect(screen.getAllByText(/小满一家/).length).toBeGreaterThan(0);
    expect(screen.getByText('今天的时间线')).toBeInTheDocument();
    expect(screen.getByText('合拍时刻')).toBeInTheDocument();
  });

  it('navigates to the month garden', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getAllByRole('button', { name: '花园' })[0]!);
    expect(screen.getByText('MONTH GARDEN')).toBeInTheDocument();
    expect(screen.getByText('本月高光')).toBeInTheDocument();
  });

  it('creates an activity from the quick add button', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: '添加活动' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.type(screen.getByLabelText('标题'), '公园放风筝');
    await user.click(screen.getByRole('button', { name: /放进日历/ }));
    expect(await screen.findByText('安排好了，记得告诉家人')).toBeInTheDocument();
  });

  it('opens a day story from the month view', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getAllByRole('button', { name: '花园' })[0]!);
    const dayButtons = screen.getAllByRole('button', { name: /\d+月\d+日，\d+ 个活动/ });
    await user.click(dayButtons[8]!);
    expect(screen.getByText('DAY STORY')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /安排活动/ })).toBeInTheDocument();
  });
});
