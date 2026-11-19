import type { CSSProperties } from 'react';
import { Clock3, MapPin, Users } from 'lucide-react';
import { formatEventWhen } from '../lib/dates';
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
  const allFamily =
    event.memberIds.length === 0 ||
    state.members.filter((member) => !member.deletedAt).every((member) => event.memberIds.includes(member.id));
  const style = { '--kind': kind.color } as CSSProperties;
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
          <i style={{ background: kind.color }} aria-hidden="true" />
          {kind.label}
        </span>
        {stickersOn && (
          <span className="event-sticker">
            <StickerFace emoji={stickerEmoji} kindColor={kind.color} size={stickerSize} tilt={tilt} />
          </span>
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
          {allFamily ? (
            <span className="event-family">
              <Users size={13} strokeWidth={2.2} aria-hidden="true" />
              全家
            </span>
          ) : (
            <AvatarStack members={participants} size="xs" max={3} />
          )}
        </span>
      )}
    </button>
  );
}
