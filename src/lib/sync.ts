import type { AppState } from './types';
import { mergeStates } from './reducer';

export interface SyncConfig {
  enabled: boolean;
  url: string;
  room: string;
  key: string;
  lastSyncAt?: string;
  revision?: number;
}

const STORAGE_KEY = 'pelemele.sync.v1';

const EMPTY: SyncConfig = { enabled: false, url: '', room: '', key: '' };

export function loadSyncConfig(): SyncConfig {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<SyncConfig>;
    return {
      enabled: Boolean(parsed.enabled),
      url: typeof parsed.url === 'string' ? parsed.url : '',
      room: typeof parsed.room === 'string' ? parsed.room : '',
      key: typeof parsed.key === 'string' ? parsed.key : '',
      lastSyncAt: typeof parsed.lastSyncAt === 'string' ? parsed.lastSyncAt : undefined,
      revision: typeof parsed.revision === 'number' ? parsed.revision : undefined,
    };
  } catch {
    return EMPTY;
  }
}

export function saveSyncConfig(config: SyncConfig): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // The caller still has the in-memory values.
  }
}

export function normalizeSyncUrl(input: string): string {
  return input.trim().replace(/\/+$/, '');
}

export function validateSyncConfig(config: SyncConfig): string | null {
  let parsed: URL;
  try {
    parsed = new URL(normalizeSyncUrl(config.url));
  } catch {
    return '同步服务地址需要是完整的 http(s) 地址';
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '同步服务地址需要是 http 或 https';
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{2,47}$/.test(config.room)) {
    return '家庭码需要 3–48 位字母、数字、- 或 _';
  }
  if (config.key.length < 6) return '家庭密钥至少 6 位';
  return null;
}

function roomUrl(config: SyncConfig): string {
  return `${normalizeSyncUrl(config.url)}/api/rooms/${encodeURIComponent(config.room)}`;
}

function headers(config: SyncConfig): HeadersInit {
  return { 'x-family-key': config.key };
}

export interface RemoteRoom {
  revision: number;
  state: AppState;
  updatedAt: string;
}

async function parseError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { message?: string; error?: string };
    return payload.message ?? payload.error ?? `同步服务返回 ${response.status}`;
  } catch {
    return `同步服务返回 ${response.status}`;
  }
}

export async function checkSyncHealth(url: string): Promise<boolean> {
  const response = await fetch(`${normalizeSyncUrl(url)}/health`, { headers: { accept: 'application/json' } });
  return response.ok;
}

export async function pullRoom(config: SyncConfig): Promise<RemoteRoom | null> {
  let response: Response;
  try {
    response = await fetch(roomUrl(config), { headers: headers(config) });
  } catch {
    throw new Error('无法连接同步服务，请检查地址和网络');
  }
  if (response.status === 404) return null;
  if (response.status === 401 || response.status === 403) {
    throw new Error('家庭密钥不对');
  }
  if (!response.ok) throw new Error(await parseError(response));
  const payload = (await response.json()) as RemoteRoom;
  if (!payload || typeof payload.revision !== 'number' || !payload.state) {
    throw new Error('同步服务返回了无法识别的数据');
  }
  return payload;
}

interface PushResult {
  revision: number;
  updatedAt: string;
}

interface PushConflict {
  conflict: RemoteRoom;
}

async function pushRoom(
  config: SyncConfig,
  baseRevision: number,
  state: AppState,
): Promise<PushResult | PushConflict> {
  let response: Response;
  try {
    response = await fetch(roomUrl(config), {
      method: 'PUT',
      headers: { ...headers(config), 'content-type': 'application/json' },
      body: JSON.stringify({ baseRevision, state }),
    });
  } catch {
    throw new Error('无法连接同步服务，请检查地址和网络');
  }

  if (response.status === 409) {
    const payload = (await response.json()) as RemoteRoom & { error?: string; message?: string };
    if (payload.state && typeof payload.revision === 'number') return { conflict: payload };
    throw new Error(payload.message ?? '同步冲突，请重试');
  }
  if (response.status === 401 || response.status === 403) throw new Error('家庭密钥不对');
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as PushResult;
}

export interface SyncResult {
  state: AppState;
  revision: number;
  created: boolean;
  remoteChanged: boolean;
}

export async function syncNow(config: SyncConfig, localState: AppState): Promise<SyncResult> {
  const validation = validateSyncConfig(config);
  if (validation) throw new Error(validation);

  let working = localState;
  let created = false;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const remote = await pullRoom(config);
    if (!remote) {
      const pushed = await pushRoom(config, 0, working);
      if ('conflict' in pushed) {
        working = mergeStates(working, pushed.conflict.state);
        continue;
      }
      return { state: working, revision: pushed.revision, created: true, remoteChanged: false };
    }

    const merged = mergeStates(working, remote.state);
    const remoteChanged = JSON.stringify(merged) !== JSON.stringify(remote.state);
    const localChanged = JSON.stringify(merged) !== JSON.stringify(working);
    if (!remoteChanged) {
      return { state: merged, revision: remote.revision, created, remoteChanged: localChanged };
    }

    const pushed = await pushRoom(config, remote.revision, merged);
    if ('conflict' in pushed) {
      working = mergeStates(merged, pushed.conflict.state);
      continue;
    }
    return { state: merged, revision: pushed.revision, created, remoteChanged };
  }

  throw new Error('同步冲突次数太多，请稍后再试');
}
