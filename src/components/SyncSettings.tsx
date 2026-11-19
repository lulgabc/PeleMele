import { useState } from 'react';
import { Cloud, KeyRound, RefreshCw, Server, Sparkles } from 'lucide-react';
import { loadSyncConfig, saveSyncConfig, syncNow, validateSyncConfig } from '../lib/sync';
import type { SyncConfig } from '../lib/sync';
import { useFamily } from '../state/FamilyContext';
import { useUI } from '../state/UIContext';

function randomCode(length = 4): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

export function SyncSettings() {
  const { state, dispatch } = useFamily();
  const { toast } = useUI();
  const [config, setConfig] = useState<SyncConfig>(() => loadSyncConfig());
  const [busy, setBusy] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const patch = (values: Partial<SyncConfig>) => setConfig((current) => ({ ...current, ...values }));

  const generate = () => {
    const next: SyncConfig = {
      ...config,
      url: config.url || 'http://localhost:8787',
      room: `family-${randomCode(5)}`,
      key: `${randomCode(4)}-${randomCode(4)}-${randomCode(4)}`,
    };
    setConfig(next);
    toast('家庭码和密钥已生成，记得发给家人', 'info');
  };

  const connect = async () => {
    const next: SyncConfig = { ...config, enabled: true, url: config.url.trim(), room: config.room.trim(), key: config.key.trim() };
    const validation = validateSyncConfig(next);
    if (validation) {
      toast(validation, 'error');
      return;
    }
    setBusy(true);
    try {
      saveSyncConfig(next);
      const result = await syncNow(next, state);
      const saved = { ...next, lastSyncAt: new Date().toISOString(), revision: result.revision };
      saveSyncConfig(saved);
      setConfig(saved);
      dispatch({ type: 'state/replace', state: result.state });
      toast(result.created ? '家庭空间已创建，把家庭码和密钥发给家人吧' : '家庭日历已同步');
    } catch (error) {
      toast(error instanceof Error ? error.message : '同步失败，请检查地址和密钥', 'error');
    } finally {
      setBusy(false);
    }
  };

  const disconnect = () => {
    const next = { ...config, enabled: false };
    saveSyncConfig(next);
    setConfig(next);
    toast('已关闭自动同步，服务器上的数据还在', 'info');
  };

  return (
    <section className="panel settings-card settings-card--sync" id="sync">
      <div className="settings-section-head">
        <span className="settings-icon" aria-hidden="true">
          <Cloud size={19} strokeWidth={2.2} />
        </span>
        <div>
          <h2>家庭同步</h2>
          <p>一台小服务器，让全家人的手机看到同一份日历。</p>
        </div>
        <span className={`sync-pill ${config.enabled ? 'is-on' : ''}`}>
          {config.enabled ? '自动同步' : '未开启'}
        </span>
      </div>

      <div className="sync-form">
        {state.isSample && (
          <p className="sync-sample-note">
            当前还是「{state.familyName}」示例家庭。可以先在上面的「家庭成员」里改名，或以它作为起点。
          </p>
        )}
        <label className="field sync-url">
          <span className="field-label">同步服务地址</span>
          <input
            className="input"
            value={config.url}
            onChange={(event) => patch({ url: event.target.value })}
            placeholder="http://192.168.1.20:8787"
            spellCheck={false}
            autoComplete="off"
          />
        </label>
        <label className="field">
          <span className="field-label">家庭码</span>
          <input
            className="input"
            value={config.room}
            onChange={(event) => patch({ room: event.target.value })}
            placeholder="family-abcde"
            spellCheck={false}
            autoComplete="off"
          />
        </label>
        <label className="field">
          <span className="field-label">家庭密钥</span>
          <span className="secret-wrap">
            <input
              className="input"
              type={showKey ? 'text' : 'password'}
              value={config.key}
              onChange={(event) => patch({ key: event.target.value })}
              placeholder="至少 6 位"
              spellCheck={false}
              autoComplete="new-password"
            />
            <button type="button" className="text-button secret-toggle" onClick={() => setShowKey((value) => !value)}>
              {showKey ? '隐藏' : '显示'}
            </button>
          </span>
        </label>
      </div>

      <div className="sync-actions">
        <button type="button" className="button button--ghost button--small" onClick={generate}>
          <Sparkles size={15} strokeWidth={2.4} /> 生成一组
        </button>
        <button type="button" className="button button--primary button--small" onClick={connect} disabled={busy}>
          {busy ? <RefreshCw size={15} className="is-spinning" /> : <Cloud size={15} strokeWidth={2.4} />}
          {busy ? '正在同步…' : config.enabled ? '保存并同步' : '连接并同步'}
        </button>
        {config.enabled && (
          <button type="button" className="text-button" onClick={disconnect}>
            关闭自动同步
          </button>
        )}
      </div>

      <div className="sync-status">
        <span>
          <KeyRound size={14} strokeWidth={2.2} />
          {config.lastSyncAt
            ? `上次同步 ${new Date(config.lastSyncAt).toLocaleString('zh-CN', {
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}`
            : '还没有同步过'}
          {typeof config.revision === 'number' ? ` · 修订 ${config.revision}` : ''}
        </span>
        <span className="sync-status-note">应用打开或切回时自动同步</span>
      </div>

      <details className="help-details">
        <summary>怎么启动一台家庭同步服务器？</summary>
        <ol>
          <li>找一台常开的电脑、NAS 或树莓派，装 Node 20+。</li>
          <li>在项目目录运行 <code>node server/index.mjs --port 8787</code>。</li>
          <li>把上面的地址填成 <code>http://那台电脑的局域网IP:8787</code>。</li>
          <li>点“生成一组”，再把家庭码和密钥单独发给家人。</li>
        </ol>
        <p>
          <Server size={13} strokeWidth={2.2} /> 服务端零依赖，快照存在 <code>server/data/</code>；密钥只存 scrypt
          哈希。公网部署时请用 HTTPS 并设置强密钥。
        </p>
      </details>
      <p className="privacy-line">
        <KeyRound size={14} strokeWidth={2.2} />
        Google access token 不会出现在同步数据里；只有忙碌/空闲区间会随日历同步。
      </p>
    </section>
  );
}
