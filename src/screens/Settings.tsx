import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Download,
  ExternalLink,
  Info,
  Link2,
  Palette,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { addDays, startOfDay } from 'date-fns';
import {
  fetchGoogleBusy,
  getValidToken,
  requestGoogleToken,
  revokeGoogleToken,
} from '../lib/google';
import { dayKey, formatMonthDay } from '../lib/dates';
import { createSeedState } from '../lib/seed';
import { parseStateFile, serializeState } from '../lib/storage';
import { SKINS, skinById } from '../lib/themes';
import type { Member } from '../lib/types';
import { activeMembers, parents } from '../lib/selectors';
import { useFamily } from '../state/FamilyContext';
import { useUI } from '../state/UIContext';
import { Avatar } from '../components/Avatar';
import { BrandLockup } from '../components/Brand';
import { MemberEditor } from '../components/MemberEditor';
import { StickerFace } from '../components/StickerFace';
import { SyncSettings } from '../components/SyncSettings';

export function SettingsScreen() {
  const { state, dispatch } = useFamily();
  const { go, settingsReturn, toast } = useUI();
  const members = activeMembers(state);
  const parentMembers = parents(state);
  const isNative = Capacitor.isNativePlatform();
  const [editingMember, setEditingMember] = useState<Member | 'new' | null>(null);
  const [googleMemberId, setGoogleMemberId] = useState(
    state.google.connectedMemberId ?? parentMembers[0]?.id ?? '',
  );
  const [calendarId, setCalendarId] = useState(
    state.google.calendars[state.google.connectedMemberId ?? parentMembers[0]?.id ?? ''] ?? 'primary',
  );
  const [syncing, setSyncing] = useState(false);
  const [disconnectConfirm, setDisconnectConfirm] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const customBase = state.customTheme ?? {
    bg: skinById(state.skin).swatches[0]!,
    primary: skinById(state.skin).swatches[1]!,
    accent: skinById(state.skin).swatches[2]!,
  };

  const googleStatus = useMemo(
    () =>
      parentMembers.map((member) => ({
        member,
        synced: Boolean(state.google.busyMeta[member.id]),
        meta: state.google.busyMeta[member.id],
      })),
    [parentMembers, state.google.busyMeta],
  );

  const saveMember = (member: Member) => {
    dispatch({ type: 'member/upsert', member });
    setEditingMember(null);
    toast(`${member.name} 的资料已保存`);
  };

  const deleteMember = (member: Member) => {
    dispatch({ type: 'member/delete', id: member.id });
    setEditingMember(null);
    toast(`${member.name} 已从家庭中移除`, 'info');
  };

  async function connectGoogle() {
    if (!state.google.clientId.trim()) {
      toast('先填写 Google OAuth Client ID', 'error');
      return;
    }
    if (!googleMemberId) {
      toast('先选择要连接哪位家长', 'error');
      return;
    }
    setSyncing(true);
    try {
      const token = getValidToken() ?? (await requestGoogleToken(state.google.clientId, true));
      const rangeStart = startOfDay(new Date());
      const rangeEnd = addDays(rangeStart, 21);
      const blocks = await fetchGoogleBusy(
        token.accessToken,
        [{ memberId: googleMemberId, calendarId: calendarId.trim() || 'primary' }],
        rangeStart,
        rangeEnd,
      );
      dispatch({ type: 'settings/google', patch: { calendars: { ...state.google.calendars, [googleMemberId]: calendarId.trim() || 'primary' } } });
      dispatch({
        type: 'google/busy',
        memberId: googleMemberId,
        blocks,
        rangeStart: rangeStart.toISOString(),
        rangeEnd: rangeEnd.toISOString(),
        account: null,
      });
      const name = members.find((member) => member.id === googleMemberId)?.name ?? '家人';
      toast(`已连接 ${name} 的 Google 日历，读到 ${blocks.length} 段忙碌时间`);
    } catch (error) {
      toast(error instanceof Error ? error.message : '连接失败，请稍后再试', 'error');
    } finally {
      setSyncing(false);
    }
  }

  async function disconnectGoogle() {
    await revokeGoogleToken();
    const connected = state.google.connectedMemberId;
    const busyMeta = { ...state.google.busyMeta };
    if (connected) delete busyMeta[connected];
    const busy = state.google.busy.filter(
      (block) => !(block.source === 'google' && (!connected || block.memberId === connected)),
    );
    dispatch({
      type: 'settings/google',
      patch: {
        connectedMemberId: null,
        account: null,
        lastSyncAt: null,
        busy,
        busyMeta,
        demoBusy: true,
      },
    });
    setDisconnectConfirm(false);
    toast('已断开 Google 日历', 'info');
  }

  function exportData() {
    const blob = new Blob([serializeState(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `pelemele-${dayKey(new Date())}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast('备份已下载');
  }

  async function importData(file: File) {
    try {
      const text = await file.text();
      const imported = parseStateFile(text);
      dispatch({ type: 'state/replace', state: imported });
      toast('家庭日程已导入');
    } catch (error) {
      toast(error instanceof Error ? error.message : '导入失败', 'error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function resetDemo() {
    dispatch({ type: 'state/replace', state: createSeedState() });
    setResetConfirm(false);
    toast('已恢复为示例家庭', 'info');
  }

  return (
    <div className="page settings-page">
      <div className="settings-top">
        <button type="button" className="icon-button" onClick={() => go(settingsReturn)} aria-label="返回">
          <ArrowLeft size={21} strokeWidth={2.3} />
        </button>
        <div>
          <span className="eyebrow">SETTINGS</span>
          <h1>把家调成喜欢的样子</h1>
          <p className="page-sub">皮肤、家人、Google 日历，都只属于你们。</p>
        </div>
      </div>

      <div className="settings-grid">
        <section className="panel settings-card settings-card--appearance" id="appearance">
          <SectionHeader icon={<Palette size={19} strokeWidth={2.2} />} title="皮肤" note="换一种心情。" />
          <div className="skin-choices" role="group" aria-label="配色皮肤">
            {SKINS.map((skin) => {
              const active = state.skin === skin.id;
              return (
                <button
                  key={skin.id}
                  type="button"
                  className={`skin-choice ${active ? 'is-active' : ''}`}
                  onClick={() => dispatch({ type: 'settings/skin', skin: skin.id })}
                  aria-pressed={active}
                >
                  <span className="skin-choice-colors" aria-hidden="true">
                    {skin.swatches.slice(0, 4).map((color) => (
                      <i key={color} style={{ background: color }} />
                    ))}
                  </span>
                  <span className="skin-choice-name">
                    {skin.name}
                    {active && <Check size={13} strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="sticker-mode-row">
            <StickerFace emoji="🏕️" kindColor="#2FA8A0" size="sm" tilt={-5} />
            <div className="sticker-mode-copy">
              <strong>贴纸玩心</strong>
              <span>活动使用模切贴纸；表单里可以挑选。关掉就回到简洁文字卡。</span>
            </div>
            <button
              type="button"
              className={`switch ${state.stickerMode ? 'is-on' : ''}`}
              role="switch"
              aria-checked={state.stickerMode}
              aria-label="贴纸玩心"
              onClick={() => dispatch({ type: 'settings/stickers', value: !state.stickerMode })}
            >
              <span className="switch-knob" aria-hidden="true" />
              {state.stickerMode ? '已开启' : '已关闭'}
            </button>
          </div>

          <details className={`custom-theme ${state.skin === 'custom' ? 'is-active' : ''}`}>
            <summary>
              <span>自定义配色</span>
              <small>三种颜色，自动派生整套</small>
              <ChevronDown size={16} strokeWidth={2.2} className="disclosure-chevron" aria-hidden="true" />
            </summary>
            <div className="custom-theme-body">
              <div className="color-inputs">
                {(
                  [
                    { key: 'bg', label: '底色' },
                    { key: 'primary', label: '主色' },
                    { key: 'accent', label: '点缀' },
                  ] as const
                ).map((item) => {
                  const value = customBase[item.key];
                  return (
                    <label key={item.key} className="color-input">
                      <span className="field-label">{item.label}</span>
                      <span className="color-input-control">
                        <input
                          type="color"
                          value={value}
                          onChange={(event) =>
                            dispatch({
                              type: 'settings/custom-theme',
                              theme: { ...customBase, [item.key]: event.target.value },
                            })
                          }
                          aria-label={`${item.label}颜色`}
                        />
                        <code>{value.toUpperCase()}</code>
                      </span>
                    </label>
                  );
                })}
              </div>
              <p className="custom-theme-hint">
                当前：{state.skin === 'custom' ? '自定义配色' : skinById(state.skin).name}。改任意颜色会自动切到自定义。
              </p>
            </div>
          </details>
        </section>

        <section className="panel settings-card" id="family">
          <SectionHeader icon={<Users size={19} strokeWidth={2.2} />} title="家庭成员" note="颜色和头像会出现在每一张活动卡上。" />
          <label className="field">
            <span className="field-label">家庭名称</span>
            <input
              className="input"
              value={state.familyName}
              onChange={(event) => dispatch({ type: 'settings/family-name', name: event.target.value })}
              maxLength={24}
            />
          </label>
          <div className="member-list">
            {members.map((member) => (
              <div className="member-row" key={member.id}>
                <Avatar member={member} size="md" labeled />
                <div className="member-row-copy">
                  <strong>{member.name}</strong>
                  <span>
                    {member.role === 'parent' ? '家长' : '孩子'}
                    {member.birthday ? ` · 生日 ${formatMonthDay(member.birthday)}` : ''}
                  </span>
                </div>
                <button
                  type="button"
                  className="icon-button icon-button--small"
                  onClick={() => setEditingMember(member)}
                  aria-label={`编辑 ${member.name}`}
                >
                  <Pencil size={16} strokeWidth={2.2} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="button button--soft button--small add-member" onClick={() => setEditingMember('new')}>
            <Plus size={16} strokeWidth={2.6} /> 添加一位家人
          </button>
        </section>

        <section className="panel settings-card settings-card--google" id="google">
          <SectionHeader
            icon={<Link2 size={19} strokeWidth={2.2} />}
            title="Google 日历"
            note="只读取忙碌/空闲，不读取事件内容。"
          />
          <label className="field">
            <span className="field-label">OAuth Client ID</span>
            <input
              className="input"
              value={state.google.clientId}
              onChange={(event) => dispatch({ type: 'settings/google', patch: { clientId: event.target.value } })}
              placeholder="1234567890-xxxx.apps.googleusercontent.com"
              spellCheck={false}
              autoComplete="off"
            />
          </label>
          <div className="google-form-row">
            <label className="field">
              <span className="field-label">连接哪位家长</span>
              <span className="select-wrap">
                <select
                  className="input"
                  value={googleMemberId}
                  onChange={(event) => {
                    const id = event.target.value;
                    setGoogleMemberId(id);
                    setCalendarId(state.google.calendars[id] ?? 'primary');
                  }}
                >
                  {parentMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} strokeWidth={2.2} aria-hidden="true" />
              </span>
            </label>
            <label className="field">
              <span className="field-label">日历 ID</span>
              <input
                className="input"
                value={calendarId}
                onChange={(event) => setCalendarId(event.target.value)}
                onBlur={() =>
                  dispatch({
                    type: 'settings/google',
                    patch: {
                      calendars: {
                        ...state.google.calendars,
                        [googleMemberId]: calendarId.trim() || 'primary',
                      },
                    },
                  })
                }
                placeholder="primary"
                spellCheck={false}
              />
            </label>
          </div>
          <div className="google-actions">
            <button
              type="button"
              className="button button--primary button--small"
              onClick={connectGoogle}
              disabled={syncing || isNative}
            >
              {syncing ? <RefreshCw size={15} className="is-spinning" /> : <Link2 size={15} strokeWidth={2.4} />}
              {syncing ? '正在同步…' : isNative ? '请在网页版连接' : '连接并同步 21 天'}
            </button>
            {state.google.connectedMemberId && (
              <button
                type="button"
                className="button button--ghost button--small"
                onClick={connectGoogle}
                disabled={syncing}
              >
                <RefreshCw size={15} strokeWidth={2.4} /> 刷新
              </button>
            )}
          </div>
          {isNative && (
            <p className="privacy-line">
              <ShieldCheck size={14} strokeWidth={2.2} />
              原生 App 内暂不弹出 Google 授权；请先在网页/PWA 连接，忙碌区间会通过家庭同步到达这台设备。
            </p>
          )}

          <div className="google-status-list">
            {googleStatus.map(({ member, synced, meta }) => (
              <div className="google-status" key={member.id}>
                <Avatar member={member} size="xs" />
                <span>{member.name}</span>
                <em className={synced ? 'is-on' : ''}>
                  {synced ? `已同步 ${meta ? new Date(meta.updatedAt).toLocaleDateString('zh-CN') : ''}` : '未同步'}
                </em>
              </div>
            ))}
          </div>
          {state.google.connectedMemberId && (
            <div className="disconnect-row">
              {disconnectConfirm ? (
                <span className="inline-confirm">
                  这会清除已缓存的忙碌时间。
                  <button type="button" className="text-button text-button--danger" onClick={disconnectGoogle}>
                    断开
                  </button>
                  <button type="button" className="text-button" onClick={() => setDisconnectConfirm(false)}>
                    取消
                  </button>
                </span>
              ) : (
                <button type="button" className="text-button text-button--danger" onClick={() => setDisconnectConfirm(true)}>
                  断开 Google 连接
                </button>
              )}
            </div>
          )}

          <details className="help-details">
            <summary>怎么拿到 Client ID？</summary>
            <ol>
              <li>在 Google Cloud Console 新建项目，启用 <strong>Google Calendar API</strong>。</li>
              <li>配置 OAuth 同意屏幕（External），把家人都加到 Test users。</li>
              <li>创建 OAuth Client ID，类型选 <strong>Web application</strong>。</li>
              <li>Authorized JavaScript origins 填 `http://localhost:5173` 和你的部署域名。</li>
              <li>把 Client ID 粘贴到上面。应用只申请 `calendar.freebusy` 只读权限。</li>
            </ol>
            <a
              className="text-button"
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noreferrer"
            >
              打开 Google Cloud Console <ExternalLink size={14} strokeWidth={2.3} />
            </a>
          </details>
          <p className="privacy-line">
            <ShieldCheck size={14} strokeWidth={2.2} />
            access token 只存在本次浏览会话里，不会写进备份或同步数据。
          </p>
        </section>

        <SyncSettings />

        <section className="panel settings-card" id="data">
          <SectionHeader icon={<Info size={19} strokeWidth={2.2} />} title="数据与隐私" note="没有账号，默认只在本机。" />
          <div className="data-actions">
            <button type="button" className="button button--soft" onClick={exportData}>
              <Download size={16} strokeWidth={2.4} /> 导出备份
            </button>
            <button type="button" className="button button--soft" onClick={() => fileInputRef.current?.click()}>
              <Upload size={16} strokeWidth={2.4} /> 导入备份
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="visually-hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importData(file);
              }}
            />
          </div>
          <p className="settings-note">
            备份是一个 JSON 文件，包含家庭成员和活动，不包含 Google token。可以 AirDrop、微信或邮件发给家人。
          </p>
          <div className="reset-row">
            {resetConfirm ? (
              <span className="inline-confirm">
                会覆盖当前数据，确定吗？
                <button type="button" className="text-button text-button--danger" onClick={resetDemo}>
                  恢复示例
                </button>
                <button type="button" className="text-button" onClick={() => setResetConfirm(false)}>
                  取消
                </button>
              </span>
            ) : (
              <button type="button" className="text-button text-button--danger" onClick={() => setResetConfirm(true)}>
                <Trash2 size={14} strokeWidth={2.3} /> 恢复为示例家庭
              </button>
            )}
          </div>
        </section>

        <section className="panel settings-card settings-card--about" id="about">
          <BrandLockup compact />
          <p>
            PeleMele 是一个轻量、无账号的家庭共享日历。Web / iOS / Android 共用同一份故事。
          </p>
          <p className="settings-note">
            安装到手机：浏览器菜单里选择“安装应用”或“添加到主屏幕”。iOS Safari 在分享菜单里。
          </p>
          <div className="about-meta">
            <span>v0.1.0</span>
            <span>·</span>
            <span>为 3–5 口之家设计</span>
            <span>·</span>
            <span>Made with warm colors</span>
          </div>
        </section>
      </div>

      {editingMember && (
        <MemberEditor
          key={editingMember === 'new' ? 'new' : editingMember.id}
          member={editingMember === 'new' ? null : editingMember}
          canDelete={
            editingMember !== 'new' &&
            (editingMember.role !== 'parent' || parentMembers.length > 1)
          }
          onClose={() => setEditingMember(null)}
          onSave={saveMember}
          onDelete={deleteMember}
        />
      )}
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  note,
}: {
  icon: ReactNode;
  title: string;
  note: string;
}) {
  return (
    <div className="settings-section-head">
      <span className="settings-icon" aria-hidden="true">{icon}</span>
      <div>
        <h2>{title}</h2>
        <p>{note}</p>
      </div>
    </div>
  );
}
