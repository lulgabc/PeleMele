import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
    expect(screen.getAllByRole('button', { name: /个活动/ }).length).toBeGreaterThan(0);
  });

  it('creates an activity from the quick add button', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: '添加活动' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.type(screen.getByLabelText(/标题/), '公园放风筝');
    await user.click(screen.getByRole('button', { name: /放进日历/ }));
    expect(await screen.findByText(/贴好了/)).toBeInTheDocument();
  });

  it('saves the chosen sticker with a new activity', async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(screen.getByRole('button', { name: '添加活动' }));
    await user.type(screen.getByLabelText(/标题/), '公园放风筝');
    await user.click(screen.getByRole('button', { name: '选择贴纸 🏕️' }));
    await user.click(screen.getByRole('button', { name: /放进日历/ }));
    await waitFor(() => {
      const saved = JSON.parse(window.localStorage.getItem('pelemele.state.v1') ?? '{}');
      const created = saved.events?.find((event: { title: string }) => event.title === '公园放风筝');
      expect(created?.sticker).toBe('🏕️');
    });
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
