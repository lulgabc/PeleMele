import { describe, expect, it } from 'vitest';
import { createSeedState } from '../lib/seed';
import { coerceState, parseStateFile, serializeState } from '../lib/storage';

describe('storage', () => {
  it('round-trips an exported backup', () => {
    const state = createSeedState(new Date(2026, 10, 19, 9, 0));
    const parsed = parseStateFile(serializeState(state));
    expect(parsed.familyName).toBe(state.familyName);
    expect(parsed.events.length).toBe(state.events.length);
    expect(parsed.members.length).toBe(state.members.length);
    expect(parsed.google.demoBusy).toBe(true);
  });

  it('accepts a bare state object as well as the wrapped export', () => {
    const state = createSeedState(new Date(2026, 10, 19, 9, 0));
    const parsed = parseStateFile(JSON.stringify(state));
    expect(parsed.familyName).toBe('小满一家');
  });

  it('rejects unrelated files', () => {
    expect(() => parseStateFile(JSON.stringify({ hello: 'world' }))).toThrow();
    expect(() => parseStateFile('not json')).toThrow();
  });

  it('normalizes missing settings instead of losing the family', () => {
    const state = createSeedState(new Date(2026, 10, 19, 9, 0));
    const normalized = coerceState({ members: state.members, events: state.events, skin: 'nope' });
    expect(normalized.members).toHaveLength(4);
    expect(normalized.skin).toBe('peach');
    expect(normalized.google.demoBusy).toBe(true);
  });
});
