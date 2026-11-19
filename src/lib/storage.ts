import { createSeedState } from './seed';
import { SKINS } from './themes';
import type { AppState, BusyBlock, CustomTheme, EventKind, FamilyEvent, GoogleConfig, Member } from './types';

const STORAGE_KEY = 'pelemele.state.v1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function validMembers(input: unknown): Member[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter(isRecord)
    .map((raw) => ({
      id: str(raw.id),
      name: str(raw.name, '家人'),
      role: raw.role === 'child' ? ('child' as const) : ('parent' as const),
      color: str(raw.color, '#FF6B57'),
      emoji: str(raw.emoji, '🙂'),
      birthday: typeof raw.birthday === 'string' ? raw.birthday : undefined,
      updatedAt: str(raw.updatedAt, new Date().toISOString()),
      deletedAt: typeof raw.deletedAt === 'string' ? raw.deletedAt : null,
    }))
    .filter((member) => member.id.length > 0);
}

const KINDS: EventKind[] = ['trip', 'gather', 'birthday', 'outing', 'routine', 'other'];

function validEvents(input: unknown): FamilyEvent[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter(isRecord)
    .map((raw) => ({
      id: str(raw.id),
      title: str(raw.title, '家庭活动'),
      kind: KINDS.includes(raw.kind as EventKind) ? (raw.kind as EventKind) : 'other',
      sticker: typeof raw.sticker === 'string' && raw.sticker.trim() ? raw.sticker.slice(0, 16) : undefined,
      start: str(raw.start),
      end: str(raw.end),
      allDay: Boolean(raw.allDay),
      location: str(raw.location) || undefined,
      notes: str(raw.notes) || undefined,
      memberIds: Array.isArray(raw.memberIds) ? raw.memberIds.filter((id): id is string => typeof id === 'string') : [],
      createdAt: str(raw.createdAt, new Date().toISOString()),
      updatedAt: str(raw.updatedAt, new Date().toISOString()),
      deletedAt: typeof raw.deletedAt === 'string' ? raw.deletedAt : null,
    }))
    .filter((event) => event.id && event.start && event.end && Number.isFinite(new Date(event.start).getTime()));
}

function validBusy(input: unknown): BusyBlock[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter(isRecord)
    .map((raw) => ({
      memberId: str(raw.memberId),
      start: str(raw.start),
      end: str(raw.end),
      source: (raw.source === 'google' ? 'google' : raw.source === 'manual' ? 'manual' : 'demo') as BusyBlock['source'],
    }))
    .filter((block) => block.memberId && block.start && block.end);
}

function validCustomTheme(input: unknown): CustomTheme | null {
  if (!isRecord(input)) return null;
  const bg = str(input.bg);
  const primary = str(input.primary);
  const accent = str(input.accent);
  if (!bg || !primary || !accent) return null;
  return { bg, primary, accent };
}

export function coerceState(input: unknown, base = createSeedState()): AppState {
  if (!isRecord(input)) return base;
  const members = validMembers(input.members);
  const events = validEvents(input.events);
  if (members.length === 0) return base;

  const googleRaw = isRecord(input.google) ? input.google : {};
  const google: GoogleConfig = {
    clientId: str(googleRaw.clientId),
    connectedMemberId: str(googleRaw.connectedMemberId) || null,
    account: str(googleRaw.account) || null,
    calendars: isRecord(googleRaw.calendars)
      ? Object.fromEntries(
          Object.entries(googleRaw.calendars).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
        )
      : {},
    busy: validBusy(googleRaw.busy),
    busyMeta: isRecord(googleRaw.busyMeta)
      ? Object.fromEntries(
          Object.entries(googleRaw.busyMeta)
            .filter(([, meta]) => isRecord(meta) && typeof meta.updatedAt === 'string')
            .map(([memberId, meta]) => [
              memberId,
              {
                updatedAt: str((meta as Record<string, unknown>).updatedAt),
                rangeStart: str((meta as Record<string, unknown>).rangeStart),
                rangeEnd: str((meta as Record<string, unknown>).rangeEnd),
              },
            ]),
        )
      : {},
    demoBusy: googleRaw.demoBusy !== false,
    lastSyncAt: str(googleRaw.lastSyncAt) || null,
  };

  const skin = SKINS.some((item) => item.id === input.skin) || input.skin === 'custom' ? str(input.skin, base.skin) : base.skin;

  return {
    schemaVersion: 1,
    familyName: str(input.familyName, base.familyName),
    members,
    events,
    google,
    skin,
    customTheme: validCustomTheme(input.customTheme),
    stickerMode: input.stickerMode !== false,
    weekStartsOn: input.weekStartsOn === 0 ? 0 : 1,
    onboardingSeen: Boolean(input.onboardingSeen),
    isSample: input.isSample === true,
    updatedAt: str(input.updatedAt, new Date().toISOString()),
    prefsUpdatedAt: str(input.prefsUpdatedAt, str(input.updatedAt, new Date().toISOString())),
  };
}

export function loadState(): AppState {
  if (typeof window === 'undefined') return createSeedState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedState();
    return coerceState(JSON.parse(raw));
  } catch {
    return createSeedState();
  }
}

export function saveState(state: AppState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be unavailable (private mode / quota). The in-memory session still works.
  }
}

export function serializeState(state: AppState): string {
  return JSON.stringify({ app: 'pelemele', exportedAt: new Date().toISOString(), state }, null, 2);
}

export function parseStateFile(raw: string): AppState {
  const parsed = JSON.parse(raw) as unknown;
  const payload = isRecord(parsed) && isRecord(parsed.state) ? parsed.state : parsed;
  if (!isRecord(payload) || !Array.isArray(payload.members) || !Array.isArray(payload.events)) {
    throw new Error('这不是有效的 PeleMele 备份文件');
  }
  const state = coerceState(payload);
  if (state.members.length === 0) throw new Error('备份里没有家庭成员');
  return state;
}

export function clearSavedState(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}
