import type { CSSProperties } from 'react';
import type { Member } from '../lib/types';

const SIZE_PX = { xs: 24, sm: 32, md: 40, lg: 52, xl: 64 } as const;
export type AvatarSize = keyof typeof SIZE_PX;

export function Avatar({
  member,
  size = 'md',
  ring = false,
  labeled = false,
  className = '',
}: {
  member: Member;
  size?: AvatarSize;
  ring?: boolean;
  labeled?: boolean;
  className?: string;
}) {
  const style = {
    '--member-color': member.color,
    width: SIZE_PX[size],
    height: SIZE_PX[size],
    fontSize: SIZE_PX[size] * 0.52,
  } as CSSProperties;

  return (
    <span
      className={`avatar ${ring ? 'has-ring' : ''} ${className}`}
      style={style}
      role={labeled ? 'img' : undefined}
      aria-label={labeled ? member.name : undefined}
      aria-hidden={labeled ? undefined : true}
      title={member.name}
    >
      <span className="avatar-emoji">{member.emoji}</span>
    </span>
  );
}

export function AvatarStack({
  members,
  size = 'sm',
  max = 4,
  labeled = true,
}: {
  members: Member[];
  size?: AvatarSize;
  max?: number;
  labeled?: boolean;
}) {
  const shown = members.slice(0, max);
  const rest = members.length - shown.length;
  return (
    <span className="avatar-stack" aria-label={`家庭成员：${members.map((member) => member.name).join('、')}`}>
      {shown.map((member) => (
        <Avatar key={member.id} member={member} size={size} ring />
      ))}
      {rest > 0 && (
        <span className="avatar avatar-more" style={{ width: SIZE_PX[size], height: SIZE_PX[size] }} aria-hidden="true">
          +{rest}
        </span>
      )}
      {!labeled && <span className="sr-only">{members.map((member) => member.name).join('、')}</span>}
    </span>
  );
}
