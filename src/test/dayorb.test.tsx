import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { addDays, startOfDay } from 'date-fns';
import { DayOrb } from '../components/DayOrb';
import type { FamilyEvent } from '../lib/types';

function eventAt(date: Date): FamilyEvent {
  const start = startOfDay(date);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return {
    id: 'e-test',
    title: '测试活动',
    kind: 'outing',
    sticker: '🧺',
    start: start.toISOString(),
    end: end.toISOString(),
    allDay: false,
    memberIds: [],
    createdAt: start.toISOString(),
    updatedAt: start.toISOString(),
  };
}

describe('calendar day hierarchy', () => {
  it('emphasises future days that have activities', () => {
    const date = addDays(new Date(), 2);
    render(<DayOrb date={date} events={[eventAt(date)]} variant="month" onClick={() => undefined} />);
    const orb = screen.getByRole('button');
    expect(orb).toHaveClass('is-future-active');
    expect(orb).toHaveClass('has-events');
    expect(orb).not.toHaveClass('is-past');
  });

  it('recedes past days without activities', () => {
    const date = addDays(new Date(), -2);
    render(<DayOrb date={date} events={[]} variant="month" onClick={() => undefined} />);
    const orb = screen.getByRole('button');
    expect(orb).toHaveClass('is-past');
    expect(orb).toHaveClass('is-empty');
    expect(orb).not.toHaveClass('is-future-active');
  });

  it('keeps today visible even when empty', () => {
    render(<DayOrb date={new Date()} events={[]} variant="month" onClick={() => undefined} />);
    const orb = screen.getByRole('button');
    expect(orb).toHaveClass('is-today');
    expect(orb).toHaveClass('is-empty');
  });
});
