import type { BusyBlock } from './types';

export const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/calendar.freebusy';
const TOKEN_KEY = 'pelemele.google.token.v1';

interface GisTokenResponse {
  access_token?: string;
  expires_in?: number | string;
  scope?: string;
  error?: string;
  error_description?: string;
}

interface GisTokenClient {
  callback: (response: GisTokenResponse) => void;
  requestAccessToken: (options?: { prompt?: string }) => void;
}

interface GisOAuth2 {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    callback: (response: GisTokenResponse) => void;
    error_callback?: (error: { type?: string; message?: string }) => void;
    ux_mode?: 'popup' | 'redirect';
  }) => GisTokenClient;
  revoke: (token: string, done?: () => void) => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: GisOAuth2;
      };
    };
  }
}

export interface GoogleToken {
  accessToken: string;
  expiresAt: number;
  scopes: string[];
}

let gisPromise: Promise<void> | null = null;

export function loadGis(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('当前环境不支持 Google 登录'));
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisPromise) return gisPromise;

  const promise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-pelemele-gis]');
    const script = existing ?? document.createElement('script');
    const timer = window.setTimeout(() => reject(new Error('Google 登录脚本加载超时，请检查网络')), 12_000);

    const done = () => {
      window.clearTimeout(timer);
      if (window.google?.accounts?.oauth2) resolve();
      else reject(new Error('Google 登录脚本不可用，请检查网络或广告拦截插件'));
    };
    const fail = () => {
      window.clearTimeout(timer);
      reject(new Error('无法加载 Google 登录脚本，请检查网络'));
    };

    if (existing) {
      script.addEventListener('load', done, { once: true });
      script.addEventListener('error', fail, { once: true });
      if (window.google?.accounts?.oauth2) done();
      return;
    }

    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.pelemeleGis = 'true';
    script.addEventListener('load', done, { once: true });
    script.addEventListener('error', fail, { once: true });
    document.head.appendChild(script);
  });

  gisPromise = promise;
  promise.catch(() => {
    gisPromise = null;
  });
  return promise;
}

function readStoredToken(): GoogleToken | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GoogleToken;
    if (!parsed.accessToken || !parsed.expiresAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getValidToken(): GoogleToken | null {
  const token = readStoredToken();
  if (!token) return null;
  if (token.expiresAt - Date.now() < 30_000) return null;
  return token;
}

function storeToken(accessToken: string, expiresIn: number, scope: string): GoogleToken {
  const token: GoogleToken = {
    accessToken,
    expiresAt: Date.now() + Math.max(60, expiresIn) * 1000,
    scopes: scope.split(/\s+/).filter(Boolean),
  };
  try {
    window.sessionStorage.setItem(TOKEN_KEY, JSON.stringify(token));
  } catch {
    // Session storage may be unavailable; the token still lives in memory for this flow.
  }
  return token;
}

export function clearGoogleToken(): void {
  try {
    window.sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export async function requestGoogleToken(clientId: string, forceConsent = false): Promise<GoogleToken> {
  if (!clientId.trim()) throw new Error('请先填写 Google OAuth Client ID');
  await loadGis();
  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) throw new Error('Google 登录不可用');

  return new Promise<GoogleToken>((resolve, reject) => {
    let settled = false;
    const client = oauth2.initTokenClient({
      client_id: clientId.trim(),
      scope: GOOGLE_SCOPE,
      callback: () => undefined,
      error_callback: (error) => {
        if (settled) return;
        settled = true;
        if (error?.type === 'popup_closed') reject(new Error('登录窗口被关闭了'));
        else if (error?.type === 'popup_failed_to_open') reject(new Error('登录窗口被拦截，请允许弹窗后重试'));
        else reject(new Error(error?.message ?? 'Google 授权没有完成'));
      },
      ux_mode: 'popup',
    });

    client.callback = (response) => {
      if (settled) return;
      settled = true;
      if (response.error || !response.access_token) {
        reject(new Error(response.error_description ?? response.error ?? 'Google 授权没有完成'));
        return;
      }
      if (!response.scope?.includes('calendar.freebusy')) {
        reject(new Error('没有获得 Google 日历空闲权限，请重新授权'));
        return;
      }
      resolve(storeToken(response.access_token, Number(response.expires_in ?? 3600), response.scope));
    };

    client.requestAccessToken({ prompt: forceConsent || !getValidToken() ? 'consent' : '' });
  });
}

export async function revokeGoogleToken(): Promise<void> {
  const token = readStoredToken();
  clearGoogleToken();
  if (!token || !window.google?.accounts?.oauth2) return;
  await new Promise<void>((resolve) => {
    window.google!.accounts!.oauth2!.revoke(token.accessToken, () => resolve());
    window.setTimeout(resolve, 1500);
  });
}

export interface FreeBusyItem {
  memberId: string;
  calendarId: string;
}

interface FreeBusyCalendarResponse {
  busy?: Array<{ start?: string; end?: string }>;
  errors?: Array<{ reason?: string; domain?: string }>;
}

interface FreeBusyResponse {
  calendars?: Record<string, FreeBusyCalendarResponse>;
}

export async function fetchGoogleBusy(
  token: string,
  items: FreeBusyItem[],
  timeMin: Date,
  timeMax: Date,
): Promise<BusyBlock[]> {
  const validItems = items.filter((item) => item.calendarId.trim());
  if (validItems.length === 0) throw new Error('还没有设置要同步的 Google 日历');

  let response: Response;
  try {
    response = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        items: validItems.map((item) => ({ id: item.calendarId.trim() })),
      }),
    });
  } catch {
    throw new Error('无法连接 Google 日历，请检查网络');
  }

  if (response.status === 401) throw new Error('Google 授权已过期，请重新连接');
  if (response.status === 403) throw new Error('Google 拒绝了这次请求，请重新授权或检查日历权限');
  if (!response.ok) throw new Error(`Google 日历返回 ${response.status}，请稍后再试`);

  const payload = (await response.json()) as FreeBusyResponse;
  const blocks: BusyBlock[] = [];
  let calendarErrors = 0;

  for (const item of validItems) {
    const calendar = payload.calendars?.[item.calendarId.trim()];
    if (!calendar) continue;
    if (calendar.errors?.length) calendarErrors += 1;
    for (const busy of calendar.busy ?? []) {
      if (!busy.start || !busy.end) continue;
      const start = new Date(busy.start);
      const end = new Date(busy.end);
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) continue;
      if (end.getTime() <= start.getTime()) continue;
      blocks.push({
        memberId: item.memberId,
        start: start.toISOString(),
        end: end.toISOString(),
        source: 'google',
      });
    }
  }

  if (calendarErrors > 0 && blocks.length === 0) {
    throw new Error('没有读到空闲信息：请确认日历 ID 正确，并且账号有访问权限');
  }
  return blocks;
}
