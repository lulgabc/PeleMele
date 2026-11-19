
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
