import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { Member, MemberRole } from '../lib/types';
import { uid } from '../lib/dates';
import { Avatar } from './Avatar';
import { Sheet } from './Sheet';

const COLORS = ['#FF6B57', '#20AE96', '#F0A93C', '#9B7BF0', '#4C9BE8', '#EF5C9A', '#7D9B4E', '#C77B4A'];
const EMOJIS = ['🦊', '🐰', '🐯', '🐣', '🐻', '🐼', '🐨', '🐸', '🦄', '🐳', '🦁', '🐙'];

export function MemberEditor({
  member,
  canDelete,
  onClose,
  onSave,
  onDelete,
}: {
  member: Member | null;
  canDelete: boolean;
  onClose: () => void;
  onSave: (member: Member) => void;
  onDelete: (member: Member) => void;
}) {
  const [name, setName] = useState(member?.name ?? '');
  const [role, setRole] = useState<MemberRole>(member?.role ?? 'child');
  const [emoji, setEmoji] = useState(member?.emoji ?? '🐻');
  const [color, setColor] = useState(member?.color ?? COLORS[0]!);
  const [birthday, setBirthday] = useState(member?.birthday ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const preview: Member = {
    id: member?.id ?? 'preview',
    name: name || '新家人',
    role,
    color,
    emoji,
    birthday: birthday || undefined,
    updatedAt: new Date().toISOString(),
  };

  const save = () => {
    if (!name.trim()) return;
    onSave({
      ...preview,
      name: name.trim(),
      id: member?.id ?? uid('m'),
      updatedAt: member?.updatedAt ?? new Date().toISOString(),
    });
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={member ? `编辑 ${member.name}` : '添加家庭成员'}
      eyebrow="FAMILY"
      size="sm"
      footer={
        <div className="footer-split">
          {member ? (
            canDelete ? (
              confirmDelete ? (
                <div className="inline-confirm">
                  <span>真的移除？</span>
                  <button type="button" className="text-button text-button--danger" onClick={() => onDelete(member)}>
                    移除
                  </button>
                  <button type="button" className="text-button" onClick={() => setConfirmDelete(false)}>
                    取消
                  </button>
                </div>
              ) : (
                <button type="button" className="text-button text-button--danger" onClick={() => setConfirmDelete(true)}>
                  <Trash2 size={15} strokeWidth={2.3} /> 移除
                </button>
              )
            ) : (
              <span className="hint-text">至少保留一位家长</span>
            )
          ) : (
            <span />
          )}
          <button type="button" className="button button--primary" onClick={save} disabled={!name.trim()}>
            保存
          </button>
        </div>
      }
    >
      <div className="member-preview">
        <Avatar member={preview} size="xl" labeled />
        <div>
          <strong>{preview.name}</strong>
          <span>{role === 'parent' ? '家长' : '孩子'} · 会在日程中以这个颜色出现</span>
        </div>
      </div>

      <label className="field">
        <span className="field-label">名字</span>
        <input
          className="input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="比如：豆豆"
          maxLength={20}
          data-autofocus
        />
      </label>

      <div className="field">
        <span className="field-label">身份</span>
        <div className="segmented">
          {(['parent', 'child'] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={role === value ? 'is-active' : ''}
              onClick={() => setRole(value)}
              aria-pressed={role === value}
            >
              {value === 'parent' ? '家长' : '孩子'}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="field-label">头像</span>
        <div className="emoji-grid" role="group" aria-label="选择头像">
          {EMOJIS.map((value) => (
            <button
              key={value}
              type="button"
              className={`emoji-option ${emoji === value ? 'is-active' : ''}`}
              onClick={() => setEmoji(value)}
              aria-pressed={emoji === value}
              aria-label={value}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="field-label">颜色</span>
        <div className="color-row" role="group" aria-label="选择颜色">
          {COLORS.map((value) => (
            <button
              key={value}
              type="button"
              className={`color-dot ${color === value ? 'is-active' : ''}`}
              style={{ background: value }}
              onClick={() => setColor(value)}
              aria-pressed={color === value}
              aria-label={`颜色 ${value}`}
            />
          ))}
        </div>
      </div>

      <label className="field">
        <span className="field-label">生日（可选）</span>
        <input
          className="input"
          type="date"
          value={birthday}
          onChange={(event) => setBirthday(event.target.value)}
        />
      </label>
    </Sheet>
  );
}
