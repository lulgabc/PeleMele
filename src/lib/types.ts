export type MemberRole = 'parent' | 'child';

export type EventKind = 'trip' | 'gather' | 'birthday' | 'outing' | 'routine' | 'other';

export interface Member {
  id: string;
  name: string;
  role: MemberRole;
  color: string;
  emoji: string;
  birthday?: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface FamilyEvent {
  id: string;
  title: string;
  kind: EventKind;
  /** Die-cut sticker shown on cards. Falls back to the kind emoji. */
  sticker?: string;
  /** Local ISO datetime. All-day events start at 00:00 and end at 00:00 of the day AFTER the last day. */
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  notes?: string;
  /** Empty array means "the whole family". */
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export type BusySource = 'google' | 'demo' | 'manual';

export interface BusyBlock {
  memberId: string;
  start: string;
  end: string;
  source: BusySource;
}

export interface BusyMeta {
  updatedAt: string;
  rangeStart: string;
  rangeEnd: string;
}

export interface GoogleConfig {
  clientId: string;
  /** Member whose Google account was last authorized on this device. */
  connectedMemberId: string | null;
  /** Last signed-in Gmail account (display only). */
  account: string | null;
  accountName: string | null;
  accountPicture: string | null;
  /** memberId -> Google calendar id (usually "primary"). */
  calendars: Record<string, string>;
  busy: BusyBlock[];
  busyMeta: Record<string, BusyMeta>;
  demoBusy: boolean;
  lastSyncAt: string | null;
}

export interface CustomTheme {
  bg: string;
  primary: string;
  accent: string;
}

export interface AppState {
  schemaVersion: 1;
  familyName: string;
  members: Member[];
  events: FamilyEvent[];
  google: GoogleConfig;
  skin: string;
  customTheme: CustomTheme | null;
  /** Die-cut stickers, the sticker tray, and sticker-first cards. */
  stickerMode: boolean;
  /** 0 = Sunday, 1 = Monday. PeleMele is designed around Monday-first weeks. */
  weekStartsOn: 0 | 1;
  onboardingSeen: boolean;
  /** True while the state is the untouched demo family. */
  isSample: boolean;
  updatedAt: string;
  prefsUpdatedAt: string;
}

export interface EventKindMeta {
  id: EventKind;
  label: string;
  emoji: string;
  color: string;
}

export const EVENT_KINDS: EventKindMeta[] = [
  { id: 'trip', label: '旅行', emoji: '🧳', color: '#2FA8A0' },
  { id: 'gather', label: '聚会', emoji: '🎈', color: '#FF7A59' },
  { id: 'birthday', label: '生日', emoji: '🎂', color: '#EF5C9A' },
  { id: 'outing', label: '周末', emoji: '🌤️', color: '#F0A93C' },
  { id: 'routine', label: '日常', emoji: '🐚', color: '#7C8FD6' },
  { id: 'other', label: '其他', emoji: '🪄', color: '#9A8C7A' },
];

export function kindMeta(kind: EventKind): EventKindMeta {
  return EVENT_KINDS.find((k) => k.id === kind) ?? EVENT_KINDS[EVENT_KINDS.length - 1]!;
}
