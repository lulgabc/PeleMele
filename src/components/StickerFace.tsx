import type { CSSProperties } from 'react';

export type StickerSize = 'xxs' | 'xs' | 'sm' | 'md' | 'lg';

export function StickerFace({
  emoji,
  kindColor,
  size = 'md',
  tilt = 0,
  className = '',
}: {
  emoji: string;
  kindColor: string;
  size?: StickerSize;
  tilt?: number;
  className?: string;
}) {
  const style = {
    '--kind': kindColor,
    '--sticker-tilt': `${tilt}deg`,
  } as CSSProperties;

  return (
    <span className={`sticker-face sticker-face--${size} ${className}`} style={style} aria-hidden="true">
      <span className="sticker-face-emoji">{emoji}</span>
    </span>
  );
}
