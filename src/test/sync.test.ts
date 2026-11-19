import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createSeedState } from '../lib/seed';
import { syncNow, validateSyncConfig, type SyncConfig } from '../lib/sync';

const PORT = 8799;
const dataDirPromise = mkdtemp(path.join(tmpdir(), 'pelemele-sync-'));
let child: ChildProcess | undefined;
let dataDir = '';

async function waitForServer(): Promise<void> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/health`);
      if (response.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  throw new Error('sync server did not start');
}

beforeAll(async () => {
  dataDir = await dataDirPromise;
  child = spawn(process.execPath, ['server/index.mjs', '--port', String(PORT), '--data', dataDir], {
    cwd: process.cwd(),
    stdio: 'ignore',
  });
  await waitForServer();
}, 20_000);

afterAll(async () => {
  child?.kill();
  await rm(dataDir, { recursive: true, force: true });
});

describe('sync client ↔ room server', () => {
  it('validates configuration before touching the network', () => {
    expect(validateSyncConfig({ enabled: true, url: 'not-a-url', room: 'abc', key: 'secret1' })).toBeTruthy();
    expect(validateSyncConfig({ enabled: true, url: 'http://localhost:8787', room: 'a', key: 'secret1' })).toBeTruthy();
    expect(validateSyncConfig({ enabled: true, url: 'http://localhost:8787', room: 'ok-room', key: '123' })).toBeTruthy();
    expect(validateSyncConfig({ enabled: true, url: 'http://localhost:8787', room: 'ok-room', key: 'secret1' })).toBeNull();
  });

  it('creates a room, pushes local edits and merges another device', async () => {
    const config: SyncConfig = {
      enabled: true,
      url: `http://127.0.0.1:${PORT}`,
      room: `integration-${Date.now().toString(36)}`,
      key: 'family-secret',
    };

    const first = createSeedState(new Date(2026, 10, 19, 9, 0));
    const created = await syncNow(config, first);
    expect(created.created).toBe(true);
    expect(created.revision).toBe(1);

    const uploaded = await syncNow(config, {
      ...first,
      familyName: '小满一家（已同步）',
      events: first.events.map((event) =>
        event.title === '溪边露营' ? { ...event, notes: '带上新买的灯' } : event,
      ),
      updatedAt: new Date().toISOString(),
    });
    expect(uploaded.revision).toBe(2);

    const secondDevice = createSeedState(new Date(2026, 10, 19, 10, 0));
    secondDevice.events = secondDevice.events.filter((event) => event.title !== '电影夜 · 客厅');
    secondDevice.familyName = '小满一家（手机）';
    secondDevice.prefsUpdatedAt = new Date(Date.now() + 5000).toISOString();
    secondDevice.updatedAt = secondDevice.prefsUpdatedAt;
    const pulled = await syncNow(config, secondDevice);
    expect(pulled.state.familyName).toBe('小满一家（手机）');
    expect(pulled.state.events.some((event) => event.notes === '带上新买的灯')).toBe(true);
  }, 20_000);
});
