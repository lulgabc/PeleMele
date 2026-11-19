import type { CSSProperties } from 'react';

export function BrandMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="PeleMele"
    >
      <path
        d="M30 5c14.2 0 25 9.6 25.8 23.2C56.7 41.8 46 53.5 31.3 53.5 16 53.5 5.2 43.4 5.2 29.3 5.2 15.2 15.7 5 30 5Z"
        fill="var(--primary)"
      />
      <circle cx="47.5" cy="16.5" r="8.2" fill="var(--accent)" />
      <circle cx="24.4" cy="28" r="2.5" fill="var(--on-primary)" />
      <circle cx="36.1" cy="28" r="2.5" fill="var(--on-primary)" />
      <path
        d="M25.2 36.2c2.8 4.1 7 4.1 10 0"
        fill="none"
        stroke="var(--on-primary)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="m49.5 6.8 1.2 3.4 3.4 1.2-3.4 1.2-1.2 3.4-1.2-3.4-3.4-1.2 3.4-1.2 1.2-3.4Z"
        fill="var(--primary-2)"
      />
    </svg>
  );
}

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand-lockup ${compact ? 'is-compact' : ''}`}>
      <BrandMark size={compact ? 34 : 42} />
      <span className="brand-type">
        <span className="brand-name">pelemele</span>
        {!compact && <span className="brand-tag">一家人的时间海报</span>}
      </span>
    </span>
  );
}

export function Doodle({ variant = 'star', className }: { variant?: 'star' | 'heart' | 'squiggle'; className?: string }) {
  const style: CSSProperties = { color: 'var(--accent)' };
  if (variant === 'heart') {
    return (
      <svg className={className} style={style} viewBox="0 0 40 40" aria-hidden="true">
        <path
          d="M20 33C13 27 6 22 6 15.5 6 10.8 9.6 8 13.6 8c3 0 5 1.7 6.4 3.7C21.4 9.7 23.4 8 26.4 8 30.4 8 34 10.8 34 15.5 34 22 27 27 20 33Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (variant === 'squiggle') {
    return (
      <svg className={className} style={style} viewBox="0 0 100 24" aria-hidden="true">
        <path
          d="M3 15c8-12 15 8 23-1s15 8 23-1 15 8 23-1 15 8 25-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg className={className} style={style} viewBox="0 0 40 40" aria-hidden="true">
      <path
        d="m20 5 3.3 9.2L33 17.5l-9.7 3.3L20 30l-3.3-9.2L7 17.5l9.7-3.3L20 5Z"
        fill="currentColor"
      />
      <circle cx="32.5" cy="30" r="3" fill="var(--pop)" />
    </svg>
  );
}
