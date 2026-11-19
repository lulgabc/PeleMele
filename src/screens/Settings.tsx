import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  Download,
  ExternalLink,
  Info,
  Link2,
  LogIn,
  LogOut,
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
  DEFAULT_GOOGLE_CLIENT_ID,
  fetchGoogleAccount,
  fetchGoogleBusy,
  getValidToken,
  loadGis,
  requestGoogleToken,
  resolveGoogleClientId,
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
  const googleConfigRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    // Preload before the login click so the OAuth popup keeps the user gesture.
    void loadGis().catch(() => undefined);
  }, []);

  const configuredClientId = resolveGoogleClientId(state.google.clientId);
  const selectedGoogleMember = parentMembers.find((member) => member.id === googleMemberId) ?? parentMembers[0];
  const connectedGoogleMember = parentMembers.find((member) => member.id === state.google.connectedMemberId);
  const activeGoogleAccount =
    state.google.connectedMemberId === googleMemberId && state.google.account
      ? {
          email: state.google.account,
          name: state.google.accountName ?? '',
          picture: state.google.accountPicture ?? '',
        }
      : null;
  const activeBusyMeta = state.google.busyMeta[googleMemberId];

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

  async function connectGoogle(mode: 'login' | 'refresh' = 'login') {
    if (!configuredClientId) {
      googleConfigRef.current?.setAttribute('open', 'true');
      googleConfigRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast('先配置 Google OAuth Client ID，才能登录 Gmail 账户', 'error');
      return;
    }
    if (!googleMemberId) {
      toast('先选择要同步哪位家长', 'error');
      return;
    }
    setSyncing(true);
    try {
      const token =
        mode === 'refresh'
          ? getValidToken() ?? (await requestGoogleToken(configuredClientId))
          : await requestGoogleToken(configuredClientId, { selectAccount: true });
      const account = await fetchGoogleAccount(token.accessToken);
      const rangeStart = startOfDay(new Date());
      const rangeEnd = addDays(rangeStart, 21);
      const resolvedCalendarId = calendarId.trim() || 'primary';
      const blocks = await fetchGoogleBusy(
        token.accessToken,
        [{ memberId: googleMemberId, calendarId: resolvedCalendarId }],
        rangeStart,
        rangeEnd,
      );
      dispatch({
        type: 'settings/google',
        patch: { calendars: { ...state.google.calendars, [googleMemberId]: resolvedCalendarId } },
      });
      dispatch({
        type: 'google/busy',
        memberId: googleMemberId,
        blocks,
        rangeStart: rangeStart.toISOString(),
        rangeEnd: rangeEnd.toISOString(),
        account: account.email,
        accountName: account.name,
        accountPicture: account.picture,
      });
      const name = members.find((member) => member.id === googleMemberId)?.name ?? '家人';
      toast(
        mode === 'refresh'
          ? `已刷新 ${name} 的 Google 忙碌时间（${blocks.length} 段）`
          : `已登录 ${account.email}，并同步 ${name} 的 ${blocks.length} 段忙碌时间`,
      );
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Google 登录失败，请稍后再试', 'error');
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
        accountName: null,
        accountPicture: null,
        lastSyncAt: null,
        busy,
        busyMeta,
        demoBusy: true,
      },
    });
    setDisconnectConfirm(false);
    toast('已退出 Google 账户', 'info');
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
            note="家长用自己的 Gmail 登录；只读取忙碌/空闲。"
          />

          <div className="google-form-row">
            <label className="field">
              <span className="field-label">同步到哪位家长</span>
              <span className="select-wrap">
                <select
                  className="input"
                  value={googleMemberId}
                  onChange={(event) => {
                    const id = event.target.value;
                    setGoogleMemberId(id);
                    setCalendarId(state.google.calendars[id] ?? 'primary');
                    setDisconnectConfirm(false);
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
              <span className="field-label">Google 日历 ID</span>
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

          {activeGoogleAccount ? (
            <div className="google-account-card">
              <div className="google-account-main">
                {activeGoogleAccount.picture ? (
                  <img
                    className="google-avatar"
                    src={activeGoogleAccount.picture}
                    alt=""
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="google-avatar google-avatar--fallback" aria-hidden="true">
                    {(activeGoogleAccount.name || activeGoogleAccount.email).slice(0, 1).toUpperCase()}
                  </span>
                )}
                <div className="google-account-copy">
                  <strong>{activeGoogleAccount.name || 'Google 账户'}</strong>
                  <span>{activeGoogleAccount.email}</span>
                </div>
                <span className="google-account-badge">已登录</span>
              </div>
              <p className="google-account-meta">
                正在同步 <strong>{selectedGoogleMember?.name ?? '家长'}</strong>的{' '}
                {calendarId.trim() || 'primary'} 日历
                {activeBusyMeta?.updatedAt || state.google.lastSyncAt
                  ? ` · ${new Date(activeBusyMeta?.updatedAt || state.google.lastSyncAt || '').toLocaleString('zh-CN', {
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}`
                  : ''}
              </p>
              <div className="google-account-actions">
                <button
                  type="button"
                  className="button button--soft button--small"
                  onClick={() => connectGoogle('refresh')}
                  disabled={syncing}
                >
                  <RefreshCw size={15} strokeWidth={2.4} className={syncing ? 'is-spinning' : ''} />
                  {syncing ? '同步中…' : '刷新忙碌时间'}
                </button>
                <button
                  type="button"
                  className="button button--ghost button--small"
                  onClick={() => connectGoogle('login')}
                  disabled={syncing}
                >
                  <LogIn size={15} strokeWidth={2.4} /> 切换账户
                </button>
                {disconnectConfirm ? (
                  <span className="inline-confirm">
                    会清掉这台设备上缓存的忙碌时间。
                    <button type="button" className="text-button text-button--danger" onClick={disconnectGoogle}>
                      退出
                    </button>
                    <button type="button" className="text-button" onClick={() => setDisconnectConfirm(false)}>
                      取消
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    className="text-button text-button--danger"
                    onClick={() => setDisconnectConfirm(true)}
                  >
                    <LogOut size={14} strokeWidth={2.3} /> 退出登录
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="google-login-card">
              <div className="google-login-head">
                <span className="google-g" aria-hidden="true">G</span>
                <div>
                  <strong>使用 Gmail 账户登录</strong>
                  <span>
                    为 {selectedGoogleMember?.name ?? '家长'} 读取 Google 主日历的忙碌/空闲时间。
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="button button--primary google-login-button"
                onClick={() => connectGoogle('login')}
                disabled={syncing || isNative}
              >
                {syncing ? (
                  <RefreshCw size={16} className="is-spinning" />
                ) : (
                  <LogIn size={16} strokeWidth={2.4} />
                )}
                {syncing ? '等待 Google 登录…' : isNative ? '请在网页版登录' : '使用 Google 账户登录'}
              </button>
              {!configuredClientId && (
                <p className="google-hint">
                  <strong>只差管理员做一次配置。</strong> 普通家人只需要 Gmail，不需要 Google Cloud
                  账号；由应用管理员在下方「Google 登录配置」粘贴一次 OAuth Client ID，或在部署时设置
                  <code> VITE_GOOGLE_CLIENT_ID</code> 即可。
                </p>
              )}
              {connectedGoogleMember && connectedGoogleMember.id !== googleMemberId && (
                <p className="google-hint">
                  这台设备上一次登录的是 {connectedGoogleMember.name}。为{' '}
                  {selectedGoogleMember?.name ?? '另一位家长'} 登录时会打开账户选择。
                </p>
              )}
            </div>
          )}

          {isNative && (
            <p className="privacy-line">
              <ShieldCheck size={14} strokeWidth={2.2} />
              原生 App 内暂不弹出 Google 登录；请先在网页/PWA 登录，忙碌区间会通过家庭同步到达这台设备。
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

          <details className="help-details" ref={googleConfigRef}>
            <summary>Google 登录配置（管理员一次性设置）</summary>
            <p className="settings-note">
              普通家人不需要 Google Cloud，只需要 Gmail。应用管理员注册一次 OAuth Web Client ID
              即可；这是 Google 要求应用出示的身份，免费且不需要绑定信用卡。
            </p>
            <p className="settings-note">
              部署到 GitHub Pages 时，可在仓库 Variables 中设置 <code>GOOGLE_CLIENT_ID</code>；
              也可以直接粘贴到这里。完整步骤见
              <a
                className="text-button"
                href="https://github.com/lulgabc/PeleMele/blob/main/docs/GOOGLE_SETUP.md"
                target="_blank"
                rel="noreferrer"
              >
                5 分钟配置指南 <ExternalLink size={13} strokeWidth={2.3} />
              </a>
            </p>
            <label className="field">
              <span className="field-label">OAuth Client ID</span>
              <input
                className="input"
                value={state.google.clientId}
                onChange={(event) =>
                  dispatch({ type: 'settings/google', patch: { clientId: event.target.value } })
                }
                placeholder="1234567890-xxxx.apps.googleusercontent.com"
                spellCheck={false}
                autoComplete="off"
              />
            </label>
            {DEFAULT_GOOGLE_CLIENT_ID && (
              <p className="google-hint">部署环境已配置 Client ID；这里的值会覆盖环境配置。</p>
            )}
            <ol>
              <li>在 Google Cloud Console 新建项目，启用 <strong>Google Calendar API</strong>。</li>
              <li>配置 OAuth 同意屏幕（External），把家人加入 Test users。</li>
              <li>创建 OAuth Client ID，类型选 <strong>Web application</strong>。</li>
              <li>Authorized JavaScript origins 添加 `http://localhost:5173` 和 `https://lulgabc.github.io`。</li>
              <li>登录后每位家长可以各自选择自己的 Gmail 账户；只申请账户资料和 `calendar.freebusy`。</li>
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
            账户名称/邮箱/头像仅用于显示登录状态；Google 日历只读忙碌/空闲，不读取事件标题、地点或参与者。
            access token 只存在本次浏览会话，不会写进备份或同步数据。
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
            备份是一个 JSON 文件，包含家庭成员、活动和 Google 账户显示信息，不包含 Google token。可以 AirDrop、微信或邮件发给家人。
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
