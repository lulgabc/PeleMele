import { describe, expect, it } from 'vitest';
import { familyReducer, mergeStates } from '../lib/reducer';
import { createSeedState } from '../lib/seed';
import type { FamilyEvent } from '../lib/types';

function makeEvent(id: string, updatedAt: string, title = '活动'): FamilyEvent {
  return {
    id,
    title,
    kind: 'outing',
    start: '2026-11-21T02:00:00.000Z',
    end: '2026-11-21T04:00:00.000Z',
    allDay: false,
    memberIds: [],
    createdAt: updatedAt,
    updatedAt,
  };
}

describe('family reducer', () => {
  it('adds and edits events while preserving createdAt', () => {
    const state = createSeedState(new Date(2026, 10, 19, 9, 0));
    const event = makeEvent('e1', '2026-11-19T00:00:00.000Z');
    const afterAdd = familyReducer(state, { type: 'event/upsert', event });
    expect(afterAdd.events.find((item) => item.id === 'e1')?.title).toBe('活动');

    const afterEdit = familyReducer(afterAdd, {
      type: 'event/upsert',
      event: { ...event, title: '新标题' },
    });
    const saved = afterEdit.events.find((item) => item.id === 'e1');
    expect(saved?.title).toBe('新标题');
    expect(saved?.createdAt).toBe(event.createdAt);
    expect(saved!.updatedAt >= event.updatedAt).toBe(true);
  });

  it('soft deletes events so syncs cannot resurrect them', () => {
    const state = createSeedState(new Date(2026, 10, 19, 9, 0));
    const event = makeEvent('e1', '2026-11-19T00:00:00.000Z');
    const withEvent = familyReducer(state, { type: 'event/upsert', event });
    const deleted = familyReducer(withEvent, { type: 'event/delete', id: 'e1' });
    const tombstone = deleted.events.find((item) => item.id === 'e1');
    expect(tombstone?.deletedAt).toBeTruthy();
  });

  it('switches skins and stores custom colours', () => {
    const state = createSeedState(new Date(2026, 10, 19, 9, 0));
    const custom = { bg: '#101820', primary: '#ff7a59', accent: '#4ecdc4' };
    const next = familyReducer(state, { type: 'settings/custom-theme', theme: custom });
    expect(next.skin).toBe('custom');
    expect(next.customTheme).toEqual(custom);
  });
});

describe('sync merge', () => {
  it('keeps the newer version of each event and respects tombstones', () => {
    const local = createSeedState(new Date(2026, 10, 19, 9, 0));
    const remote = createSeedState(new Date(2026, 10, 19, 9, 0));
    local.events = [makeEvent('shared', '2026-11-19T10:00:00.000Z', '旧')];
    remote.events = [
      makeEvent('shared', '2026-11-19T11:00:00.000Z', '新'),
      makeEvent('remote-only', '2026-11-19T11:00:00.000Z'),
    ];
    const merged = mergeStates(local, remote);
    expect(merged.events.find((event) => event.id === 'shared')?.title).toBe('新');
    expect(merged.events.some((event) => event.id === 'remote-only')).toBe(true);
  });

  it('merges Google busy data per member by freshest sync', () => {
    const local = createSeedState(new Date(2026, 10, 19, 9, 0));
    const remote = createSeedState(new Date(2026, 10, 19, 9, 0));
    local.google.busy = [{ memberId: 'm-mom', start: '2026-11-20T01:00:00Z', end: '2026-11-20T02:00:00Z', source: 'google' }];
    local.google.busyMeta = { 'm-mom': { updatedAt: '2026-11-19T09:00:00Z', rangeStart: '', rangeEnd: '' } };
    remote.google.busy = [
      { memberId: 'm-mom', start: '2026-11-21T01:00:00Z', end: '2026-11-21T02:00:00Z', source: 'google' },
      { memberId: 'm-dad', start: '2026-11-21T03:00:00Z', end: '2026-11-21T04:00:00Z', source: 'google' },
    ];
    remote.google.busyMeta = {
      'm-mom': { updatedAt: '2026-11-19T10:00:00Z', rangeStart: '', rangeEnd: '' },
      'm-dad': { updatedAt: '2026-11-19T10:00:00Z', rangeStart: '', rangeEnd: '' },
    };
    const merged = mergeStates(local, remote);
    expect(merged.google.busy.filter((block) => block.memberId === 'm-mom')).toHaveLength(1);
    expect(merged.google.busy.find((block) => block.memberId === 'm-mom')?.start).toBe('2026-11-21T01:00:00Z');
    expect(merged.google.busy.some((block) => block.memberId === 'm-dad')).toBe(true);
  });
});
