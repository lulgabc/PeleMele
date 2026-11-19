import type { EventKind } from './types';

export interface StickerPreset {
  emoji: string;
  label: string;
  title: string;
  kind: EventKind;
  tilt: number;
}

/** The little sticker sheet on the Today page. */
export const STICKER_PRESETS: StickerPreset[] = [
  { emoji: '🏕️', label: '露营', title: '周末露营', kind: 'trip', tilt: -4 },
  { emoji: '🎂', label: '生日', title: '生日会', kind: 'birthday', tilt: 3 },
  { emoji: '🍜', label: '聚餐', title: '一起吃饭', kind: 'gather', tilt: -2 },
  { emoji: '🚲', label: '出走', title: '骑车出门', kind: 'outing', tilt: 4 },
  { emoji: '🍿', label: '电影夜', title: '电影夜', kind: 'routine', tilt: -3 },
  { emoji: '🏊', label: '游泳', title: '游泳课', kind: 'routine', tilt: 2 },
  { emoji: '🧺', label: '野餐', title: '公园野餐', kind: 'outing', tilt: -5 },
  { emoji: '🏡', label: '回家', title: '回外婆家', kind: 'gather', tilt: 1 },
];

/** A small palette used by the sticker picker in the event form. */
export const STICKER_CHOICES = [
  '🧳',
  '🎈',
  '🎂',
  '🌤️',
  '🐚',
  '🪄',
  '🏕️',
  '🍜',
  '🚲',
  '🍿',
  '🏊',
  '🧺',
  '🏡',
  '🌈',
  '🦷',
  '📚',
  '🎨',
  '⚽',
  '🌊',
  '🍦',
  '✨',
];

export function stickerFor(event: { sticker?: string }, fallbackEmoji: string): string {
  return event.sticker?.trim() || fallbackEmoji;
}
