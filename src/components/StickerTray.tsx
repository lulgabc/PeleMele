import { Plus } from 'lucide-react';
import { kindMeta } from '../lib/types';
import { STICKER_PRESETS } from '../lib/stickers';
import { useUI } from '../state/UIContext';
import { StickerFace } from './StickerFace';

export function StickerTray() {
  const { openCreate } = useUI();

  return (
    <section className="sticker-tray" aria-label="贴纸抽屉">
      <div className="sticker-tray-head">
        <div>
          <span className="eyebrow">STICKER SHEET</span>
          <h2>今天想贴哪一张？</h2>
        </div>
        <span className="sticker-tray-hint">点一下，贴进日历</span>
      </div>
      <div className="sticker-strip">
        {STICKER_PRESETS.map((preset) => {
          const meta = kindMeta(preset.kind);
          return (
            <button
              key={preset.label}
              type="button"
              className="sticker-piece"
              onClick={() =>
                openCreate({
                  date: new Date(),
                  title: preset.title,
                  kind: preset.kind,
                  sticker: preset.emoji,
                })
              }
              aria-label={`贴一张${preset.label}贴纸`}
            >
              <StickerFace emoji={preset.emoji} kindColor={meta.color} size="md" tilt={preset.tilt} />
              <span className="sticker-piece-label">{preset.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          className="sticker-piece sticker-piece--blank"
          onClick={() => openCreate({ date: new Date(), sticker: '✨' })}
          aria-label="贴一张空白贴纸"
        >
          <span className="sticker-face sticker-face--md sticker-blank-face" aria-hidden="true">
            <Plus size={24} strokeWidth={2.4} />
          </span>
          <span className="sticker-piece-label">自己写</span>
        </button>
      </div>
    </section>
  );
}
