import type { AppState, BusyBlock, CustomTheme, FamilyEvent, GoogleConfig, Member } from './types';

export type FamilyAction =
  | { type: 'event/upsert'; event: FamilyEvent }
  | { type: 'event/delete'; id: string }
  | { type: 'member/upsert'; member: Member }
  | { type: 'member/delete'; id: string }
  | { type: 'settings/skin'; skin: string }
  | { type: 'settings/custom-theme'; theme: CustomTheme | null }
  | { type: 'settings/stickers'; value: boolean }
  | { type: 'settings/family-name'; name: string }
  | { type: 'settings/week-start'; value: 0 | 1 }
  | { type: 'settings/google'; patch: Partial<GoogleConfig> }
  | { type: 'google/busy'; memberId: string; blocks: BusyBlock[]; rangeStart: string; rangeEnd: string; account?: string | null }
  | { type: 'onboarding/seen' }
  | { type: 'state/replace'; state: AppState }
  | { type: 'state/merge'; state: AppState };

function now(): string {
  return new Date().toISOString();
}

function prefsTouch(state: AppState, patch: Partial<AppState>): AppState {
  const stamp = now();
  return { ...state, ...patch, updatedAt: stamp, prefsUpdatedAt: stamp };
}

function upsertById<T extends { id: string; updatedAt: string }>(items: T[], next: T): T[] {
  const index = items.findIndex((item) => item.id === next.id);
  if (index === -1) return [...items, next];
  const copy = items.slice();
  copy[index] = next;
  return copy;
}

function mergeById<T extends { id: string; updatedAt: string }>(local: T[], remote: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of local) map.set(item.id, item);
  for (const item of remote) {
    const current = map.get(item.id);
    if (!current || item.updatedAt > current.updatedAt) map.set(item.id, item);
  }
  return [...map.values()];
}

function mergeGoogle(local: GoogleConfig, remote: GoogleConfig, preferRemote: boolean): GoogleConfig {
  const preferred = preferRemote ? remote : local;
  const busyMeta: GoogleConfig['busyMeta'] = {};
  const memberIds = new Set([...Object.keys(local.busyMeta), ...Object.keys(remote.busyMeta)]);
  const busy: BusyBlock[] = [];
  for (const memberId of memberIds) {
    const localMeta = local.busyMeta[memberId];
    const remoteMeta = remote.busyMeta[memberId];
    const useRemote = Boolean(remoteMeta && (!localMeta || remoteMeta.updatedAt > localMeta.updatedAt));
    const meta = useRemote ? remoteMeta : localMeta;
    if (meta) busyMeta[memberId] = meta;
    const chosen = useRemote ? remote : local;
    busy.push(...chosen.busy.filter((block) => block.memberId === memberId));
  }
  return {
    ...preferred,
    // OAuth state is per-device; never inherit a token-backed connection from another device.
    connectedMemberId: local.connectedMemberId,
    account: local.account,
    busy,
    busyMeta,
    lastSyncAt:
      local.lastSyncAt && remote.lastSyncAt
        ? local.lastSyncAt > remote.lastSyncAt
          ? local.lastSyncAt
          : remote.lastSyncAt
        : local.lastSyncAt ?? remote.lastSyncAt,
  };
}

export function mergeStates(local: AppState, remote: AppState): AppState {
  // A device that has never been customised should adopt the family room,
  // never merge its random demo events into a real family calendar.
  if (local.isSample) return remote;
  if (remote.isSample) return local;

  const remotePrefsNewer = remote.prefsUpdatedAt > local.prefsUpdatedAt;
  const preferred = remotePrefsNewer ? remote : local;
  return {
    ...preferred,
    members: mergeById(local.members, remote.members),
    events: mergeById(local.events, remote.events),
    google: mergeGoogle(local.google, remote.google, remotePrefsNewer),
    isSample: false,
    updatedAt: local.updatedAt > remote.updatedAt ? local.updatedAt : remote.updatedAt,
    prefsUpdatedAt: remotePrefsNewer ? remote.prefsUpdatedAt : local.prefsUpdatedAt,
  };
}

export function familyReducer(state: AppState, action: FamilyAction): AppState {
  switch (action.type) {
    case 'event/upsert': {
      const stamp = now();
      const existing = state.events.find((event) => event.id === action.event.id);
      const event: FamilyEvent = {
        ...action.event,
        createdAt: existing?.createdAt ?? action.event.createdAt ?? stamp,
        updatedAt: stamp,
        deletedAt: null,
      };
      return { ...state, events: upsertById(state.events, event), isSample: false, updatedAt: stamp };
    }
    case 'event/delete': {
      const stamp = now();
      return {
        ...state,
        events: state.events.map((event) =>
          event.id === action.id ? { ...event, deletedAt: stamp, updatedAt: stamp } : event,
        ),
        isSample: false,
        updatedAt: stamp,
      };
    }
    case 'member/upsert': {
      const stamp = now();
      const member: Member = { ...action.member, updatedAt: stamp, deletedAt: null };
      return {
        ...state,
        members: upsertById(state.members, member),
        isSample: false,
        updatedAt: stamp,
        prefsUpdatedAt: stamp,
      };
    }
    case 'member/delete': {
      const stamp = now();
      return {
        ...state,
        members: state.members.map((member) =>
          member.id === action.id ? { ...member, deletedAt: stamp, updatedAt: stamp } : member,
        ),
        isSample: false,
        updatedAt: stamp,
        prefsUpdatedAt: stamp,
      };
    }
    case 'settings/skin':
      return prefsTouch(state, { skin: action.skin });
    case 'settings/custom-theme':
      return prefsTouch(state, { customTheme: action.theme, skin: action.theme ? 'custom' : state.skin });
    case 'settings/stickers':
      return prefsTouch(state, { stickerMode: action.value });
    case 'settings/family-name':
      return prefsTouch(state, { familyName: action.name.trim() || state.familyName, isSample: false });
    case 'settings/week-start':
      return prefsTouch(state, { weekStartsOn: action.value });
    case 'settings/google':
      return prefsTouch(state, { google: { ...state.google, ...action.patch } });
    case 'google/busy': {
      const stamp = now();
      const others = state.google.busy.filter((block) => block.memberId !== action.memberId);
      return {
        ...state,
        google: {
          ...state.google,
          busy: [...others, ...action.blocks],
          busyMeta: {
            ...state.google.busyMeta,
            [action.memberId]: {
              updatedAt: stamp,
              rangeStart: action.rangeStart,
              rangeEnd: action.rangeEnd,
            },
          },
          connectedMemberId: action.memberId,
          account: action.account ?? state.google.account,
          lastSyncAt: stamp,
          demoBusy: false,
        },
        updatedAt: stamp,
        prefsUpdatedAt: stamp,
      };
    }
    case 'onboarding/seen':
      return prefsTouch(state, { onboardingSeen: true });
    case 'state/replace':
      return action.state;
    case 'state/merge':
      return mergeStates(state, action.state);
    default:
      return state;
  }
}
