import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { Doodle } from './Brand';

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  children,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-art">
        <span className="empty-sun" />
        <span className="empty-hill empty-hill-a" />
        <span className="empty-hill empty-hill-b" />
        <Doodle variant="star" className="empty-star" />
      </div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {actionLabel && onAction && (
        <button type="button" className="button button--soft" onClick={onAction}>
          <Plus size={16} strokeWidth={2.6} />
          {actionLabel}
        </button>
      )}
      {children}
    </div>
  );
}

export function SectionHead({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-head">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}
