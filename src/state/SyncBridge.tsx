import { useCallback, useEffect, useRef } from 'react';
import { loadSyncConfig, saveSyncConfig, syncNow, validateSyncConfig } from '../lib/sync';
import { useFamily } from './FamilyContext';

/**
 * Background sync: on launch, when the app regains focus, and a few seconds
 * after local edits. Errors stay silent here; Settings is the place to debug.
 */
export function SyncBridge() {
  const { state, dispatch } = useFamily();
  const stateRef = useRef(state);
  stateRef.current = state;
  const running = useRef(false);
  const lastPushed = useRef('');

  const run = useCallback(async () => {
    const config = loadSyncConfig();
    if (!config.enabled || running.current) return;
    if (validateSyncConfig(config)) return;
    running.current = true;
    try {
      const result = await syncNow(config, stateRef.current);
      const saved = { ...config, lastSyncAt: new Date().toISOString(), revision: result.revision };
      saveSyncConfig(saved);
      if (JSON.stringify(result.state) !== JSON.stringify(stateRef.current)) {
        dispatch({ type: 'state/replace', state: result.state });
      }
      lastPushed.current = JSON.stringify(result.state);
    } catch {
      // Offline or the server is down. Keep working locally.
    } finally {
      running.current = false;
    }
  }, [dispatch]);

  useEffect(() => {
    void run();
    const onFocus = () => {
      void run();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void run();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [run]);

  useEffect(() => {
    const config = loadSyncConfig();
    if (!config.enabled) return;
    if (lastPushed.current === JSON.stringify(state)) {
      lastPushed.current = '';
      return;
    }
    const timer = window.setTimeout(() => {
      void run();
    }, 3500);
    return () => window.clearTimeout(timer);
  }, [state, run]);

  return null;
}
