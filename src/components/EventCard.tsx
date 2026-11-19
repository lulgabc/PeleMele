import type { CSSProperties } from 'react';
import { Clock3, MapPin } from 'lucide-react';
import { formatEventWhen, minutesBetween } from '../lib/dates';
import { kindMeta, type FamilyEvent } from '../lib/types';
import { stickerFor } from '../lib/stickers';
import { useFamily } from '../state/FamilyContext';
import { AvatarStack } from './Avatar';
import { StickerFace } from './StickerFace';

export type EventCardVariant = 'card' | 'poster' | 'mini';

export function EventCard({
  event,
  variant = 'card',
  onClick,
  showParticipants = true,
  showNotes = false,
  className = '',
}: {
  event: FamilyEvent;
  variant?: EventCardVariant;
  onClick?: () => void;
  showParticipants?: boolean;
  showNotes?: boolean;
  className?: string;
}) {
  const { state } = useFamily();
  const kind = kindMeta(event.kind);
  const participants = state.members.filter(
    (member) => !member.deletedAt && (event.memberIds.length === 0 || event.memberIds.includes(member.id)),
  );
  const style = { '--kind': kind.color } as CSSProperties;
  const duration = event.allDay ? null : minutesBetween(event.start, event.end);
  const stickersOn = state.stickerMode;
  const stickerEmoji = stickerFor(event, kind.emoji);
  const stickerSize = variant === 'poster' ? 'lg' : variant === 'mini' ? 'xs' : 'sm';
  const tilt = (event.id.charCodeAt(event.id.length - 1) % 7) - 3;

  return (
    <button
      type="button"
      className={`event-card event-card--${variant} ${className}`}
      style={style}
      onClick={onClick}
      aria-label={`${kind.label}：${event.title}，${formatEventWhen(event)}`}
    >
      <span className="event-card-top">
        <span className="event-kind-chip">
          {!stickersOn && <span aria-hidden="true">{kind.emoji}</span>}
          {kind.label}
        </span>
        {stickersOn ? (
          <span className="event-sticker">
            <StickerFace emoji={stickerEmoji} kindColor={kind.color} size={stickerSize} tilt={tilt} />
          </span>
        ) : (
          variant === 'poster' &&
          duration !== null &&
          duration >= 180 && (
            <span className="event-duration">
              {duration >= 60 ? `${(duration / 60).toFixed(duration % 60 === 0 ? 0 : 1)} 小时` : `${duration} 分钟`}
            </span>
          )
        )}
      </span>

      <span className="event-title">{event.title}</span>

      <span className="event-meta">
        <span className="event-meta-item">
          <Clock3 size={14} strokeWidth={2.2} aria-hidden="true" />
          {formatEventWhen(event)}
        </span>
        {event.location && (
          <span className="event-meta-item">
            <MapPin size={14} strokeWidth={2.2} aria-hidden="true" />
            {event.location}
          </span>
        )}
      </span>

      {showNotes && event.notes && <span className="event-notes">{event.notes}</span>}

      {showParticipants && participants.length > 0 && (
        <span className="event-footer">
          <AvatarStack members={participants} size="xs" max={5} />
        </span>
      )}
    </button>
  );
}
