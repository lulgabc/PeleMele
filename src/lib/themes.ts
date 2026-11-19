import type { CustomTheme } from './types';

export interface Skin {
  id: string;
  name: string;
  note: string;
  dark?: boolean;
  swatches: string[];
  vars: Record<string, string>;
}

type CoreColors = {
  bg: string;
  surface: string;
  ink: string;
  inkSoft: string;
  primary: string;
  primary2: string;
  accent: string;
  pop: string;
  mint: string;
  onPrimary: string;
  onAccent: string;
  dark?: boolean;
  glowA?: string;
  glowB?: string;
};

function rgba(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const full = value.length === 3 ? value.split('').map((c) => c + c).join('') : value;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function makeVars(c: CoreColors): Record<string, string> {
  return {
    bg: c.bg,
    'bg-2': c.surface,
    surface: c.surface,
    'surface-2': c.glowA ?? c.surface,
    ink: c.ink,
    'ink-soft': c.inkSoft,
    line: rgba(c.ink, c.dark ? 0.18 : 0.13),
    primary: c.primary,
    'primary-2': c.primary2,
    accent: c.accent,
    pop: c.pop,
    mint: c.mint,
    'on-primary': c.onPrimary,
    'on-accent': c.onAccent,
    'glow-a': c.glowA ?? c.primary,
    'glow-b': c.glowB ?? c.accent,
    shadow: rgba(c.dark ? '#000000' : '#3A2638', c.dark ? 0.34 : 0.12),
  };
}

const peach: Skin = {
  id: 'peach',
  name: '蜜桃汽水',
  note: '奶油、珊瑚与薄荷，默认的暖阳。',
  swatches: ['#FFF5E9', '#FF5D4D', '#FFB03A', '#16B893'],
  vars: makeVars({
    bg: '#FFF5E9',
    surface: '#FFFCF6',
    ink: '#2F2438',
    inkSoft: '#7B6B7D',
    primary: '#FF5D4D',
    primary2: '#FFB03A',
    accent: '#16B893',
    pop: '#FF4D8D',
    mint: '#86DCC6',
    onPrimary: '#2A1512',
    onAccent: '#0C2B24',
    glowA: '#FFD5AC',
    glowB: '#C7EDDF',
  }),
};

const lime: Skin = {
  id: 'lime',
  name: '青柠野餐',
  note: '草坪、柠檬水和一点番茄红。',
  swatches: ['#F7F6E7', '#D4F038', '#1E6F4A', '#FF5C3D'],
  vars: makeVars({
    bg: '#F7F6E7',
    surface: '#FFFEF5',
    ink: '#22301F',
    inkSoft: '#6D7862',
    primary: '#D4F038',
    primary2: '#FFC83D',
    accent: '#1E6F4A',
    pop: '#FF5C3D',
    mint: '#A9E3B8',
    onPrimary: '#1C2608',
    onAccent: '#F4FFE8',
    glowA: '#ECF3B8',
    glowB: '#CDE8CE',
  }),
};

const bubble: Skin = {
  id: 'bubble',
  name: '泡泡糖',
  note: '洋红、葡萄紫和一口棉花糖。',
  swatches: ['#FFF0F7', '#FF4E9B', '#9B6BFF', '#14C5C8'],
  vars: makeVars({
    bg: '#FFF0F7',
    surface: '#FFFAFD',
    ink: '#332038',
    inkSoft: '#826F85',
    primary: '#FF4E9B',
    primary2: '#9B6BFF',
    accent: '#14C5C8',
    pop: '#FFC531',
    mint: '#FFB2D2',
    onPrimary: '#2B0A1B',
    onAccent: '#062C2D',
    glowA: '#FFD1E5',
    glowB: '#D9CCFF',
  }),
};

const sunset: Skin = {
  id: 'sunset',
  name: '海盐日落',
  note: '深海蓝上的珊瑚与金色，大胆的夜间模式。',
  dark: true,
  swatches: ['#0D2B39', '#FF7A59', '#FFC857', '#4ECDC4'],
  vars: makeVars({
    bg: '#0D2B39',
    surface: '#143846',
    ink: '#FFF4E3',
    inkSoft: '#A8C7C9',
    primary: '#FF7A59',
    primary2: '#FFC857',
    accent: '#4ECDC4',
    pop: '#FF6B9E',
    mint: '#7BE0C3',
    onPrimary: '#2A130D',
    onAccent: '#062925',
    dark: true,
    glowA: '#175267',
    glowB: '#1D5157',
  }),
};

const cocoa: Skin = {
  id: 'cocoa',
  name: '可可夜',
  note: '深可可、杏色与薄荷，睡前的暖灯。',
  dark: true,
  swatches: ['#241813', '#FFB078', '#FFD166', '#8FE3BE'],
  vars: makeVars({
    bg: '#241813',
    surface: '#31221B',
    ink: '#FFF2E2',
    inkSoft: '#C7AB97',
    primary: '#FFB078',
    primary2: '#FFD166',
    accent: '#8FE3BE',
    pop: '#FF93B0',
    mint: '#A7E8CE',
    onPrimary: '#2A1608',
    onAccent: '#08251A',
    dark: true,
    glowA: '#4A2E22',
    glowB: '#2C4034',
  }),
};

export const SKINS: Skin[] = [peach, lime, bubble, sunset, cocoa];
export const DEFAULT_SKIN = 'peach';

export function skinById(id: string): Skin {
  return SKINS.find((skin) => skin.id === id) ?? peach;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  return [
    parseInt(full.slice(0, 2), 16) || 0,
    parseInt(full.slice(2, 4), 16) || 0,
    parseInt(full.slice(4, 6), 16) || 0,
  ];
}

function toHex(rgb: [number, number, number]): string {
  return `#${rgb.map((v) => clamp(v).toString(16).padStart(2, '0')).join('')}`;
}

export function mixHex(a: string, b: string, amount: number): string {
  const ca = parseHex(a);
  const cb = parseHex(b);
  return toHex([
    ca[0] + (cb[0] - ca[0]) * amount,
    ca[1] + (cb[1] - ca[1]) * amount,
    ca[2] + (cb[2] - ca[2]) * amount,
  ]);
}

function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((v) => {
    const channel = v / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function customVars(custom: CustomTheme): Record<string, string> {
  const bg = custom.bg;
  const primary = custom.primary;
  const accent = custom.accent;
  const dark = luminance(bg) < 0.38;
  const surface = dark ? mixHex(bg, '#FFFFFF', 0.08) : mixHex(bg, '#FFFFFF', 0.6);
  const ink = dark ? '#FFF5E8' : '#2E2434';
  const inkSoft = dark ? mixHex('#FFF5E8', bg, 0.36) : mixHex(ink, bg, 0.5);
  const onPrimary = luminance(primary) > 0.42 ? '#241710' : '#FFF9F1';
  const onAccent = luminance(accent) > 0.42 ? '#152019' : '#F6FFFA';

  return makeVars({
    bg,
    surface,
    ink,
    inkSoft,
    primary,
    primary2: mixHex(primary, accent, 0.42),
    accent,
    pop: mixHex(primary, '#FF4D8D', 0.48),
    mint: mixHex(accent, '#7ED9C3', 0.5),
    onPrimary,
    onAccent,
    dark,
    glowA: mixHex(primary, bg, 0.82),
    glowB: mixHex(accent, bg, 0.82),
  });
}

export function themeVars(skinId: string, custom: CustomTheme | null): Record<string, string> {
  if (skinId === 'custom' && custom) return customVars(custom);
  return skinById(skinId).vars;
}

export function applyTheme(skinId: string, custom: CustomTheme | null): void {
  if (typeof document === 'undefined') return;
  const vars = themeVars(skinId, custom);
  const root = document.documentElement;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(`--${key}`, value);
  }
  const isDark = skinId === 'custom'
    ? luminance(custom?.bg ?? '#FFF5E9') < 0.38
    : Boolean(skinById(skinId).dark);
  root.style.colorScheme = isDark ? 'dark' : 'light';
  root.dataset.dark = isDark ? 'true' : 'false';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', vars.bg ?? '#FFF5E9');
}
