import { addDays, startOfDay, set } from 'date-fns';
import type { AppState, BusyBlock, FamilyEvent, GoogleConfig, Member } from './types';
import { iso, uid, weekStart } from './dates';

function at(day: Date, hours: number, minutes = 0): Date {
  return set(day, { hours, minutes, seconds: 0, milliseconds: 0 });
}

function allDay(day: Date, nights = 1): { start: string; end: string } {
  const start = startOfDay(day);
  return { start: iso(start), end: iso(addDays(start, nights)) };
}

function nextWeekday(from: Date, target: number): Date {
  const current = (from.getDay() + 6) % 7;
  let delta = (target - current + 7) % 7;
  if (delta === 0) delta = 7;
  return addDays(startOfDay(from), delta);
}

export function createSeedState(now = new Date()): AppState {
  const nowIso = now.toISOString();
  const today = startOfDay(now);
  const monday = weekStart(today);
  let saturday = addDays(monday, 5);
  if (today.getDay() === 0) saturday = addDays(saturday, 7);
  const sunday = addDays(saturday, 1);

  const dad: Member = {
    id: 'm-dad',
    name: '阿哲',
    role: 'parent',
    color: '#FF6B57',
    emoji: '🦊',
    birthday: '1988-04-12',
    updatedAt: nowIso,
  };
  const mom: Member = {
    id: 'm-mom',
    name: '小满',
    role: 'parent',
    color: '#20AE96',
    emoji: '🐰',
    birthday: '1990-09-08',
    updatedAt: nowIso,
  };
  const dou: Member = {
    id: 'm-dou',
    name: '豆豆',
    role: 'child',
    color: '#F0A93C',
    emoji: '🐯',
    birthday: '2018-06-01',
    updatedAt: nowIso,
  };
  const guo: Member = {
    id: 'm-guo',
    name: '果果',
    role: 'child',
    color: '#9B7BF0',
    emoji: '🐣',
    birthday: '2021-11-02',
    updatedAt: nowIso,
  };
  const members = [dad, mom, dou, guo];
  const everyone = members.map((member) => member.id);

  const event = (
    title: string,
    kind: FamilyEvent['kind'],
    start: Date,
    end: Date,
    memberIds: string[],
    options: Partial<Pick<FamilyEvent, 'location' | 'notes' | 'allDay' | 'sticker'>> = {},
  ): FamilyEvent => ({
    id: uid('ev'),
    title,
    kind,
    sticker: options.sticker,
    start: iso(start),
    end: iso(end),
    allDay: options.allDay ?? false,
    location: options.location,
    notes: options.notes,
    memberIds,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  const campingRange = allDay(saturday, 2);
  const beachSaturday = addDays(saturday, 14);
  const beachRange = allDay(beachSaturday, 3);

  const events: FamilyEvent[] = [
    event('电影夜 · 客厅', 'routine', at(today, 19, 30), at(today, 21, 15), everyone, {
      notes: '爆米花 + 豆豆选的动画片。',
      sticker: '🍿',
    }),
    event('豆豆 · 游泳课', 'routine', at(addDays(today, 1), 16, 30), at(addDays(today, 1), 17, 30), [mom.id, dou.id], {
      location: '社区泳池',
      sticker: '🏊',
    }),
    {
      ...event('溪边露营', 'trip', new Date(campingRange.start), new Date(campingRange.end), everyone, {
        allDay: true,
        location: '青岚溪谷',
        notes: '带帐篷、防蚊液和豆豆的望远镜。',
        sticker: '🏕️',
      }),
    },
    event('外婆生日午餐', 'birthday', at(sunday, 11, 30), at(sunday, 14, 30), everyone, {
      location: '外婆家',
      notes: '订一个少糖的草莓蛋糕。',
      sticker: '🎂',
    }),
    event('果果 · 牙医复查', 'routine', at(nextWeekday(now, 2), 10), at(nextWeekday(now, 2), 10, 45), [mom.id, guo.id], {
      location: '微笑牙科',
      sticker: '🦷',
    }),
    event('朋友家晚餐', 'gather', at(nextWeekday(now, 4), 18, 30), at(nextWeekday(now, 4), 21), everyone, {
      location: '阿林家',
      notes: '带一瓶气泡水和果果的备用衣服。',
      sticker: '🍜',
    }),
    event('豆豆 · 足球友谊赛', 'outing', at(addDays(saturday, 7), 9, 30), at(addDays(saturday, 7), 11), [dad.id, dou.id], {
      location: '滨河球场',
      sticker: '⚽',
    }),
    event('同学生日会', 'birthday', at(addDays(saturday, 7), 15), at(addDays(saturday, 7), 17, 30), [mom.id, dou.id], {
      location: '小鹿亲子空间',
      sticker: '🎈',
    }),
    event('植物园野餐', 'outing', at(addDays(sunday, 7), 10), at(addDays(sunday, 7), 13), everyone, {
      location: '南门大草坪',
      notes: '带野餐垫和泡泡机。',
      sticker: '🧺',
    }),
    {
      ...event('海边小长假', 'trip', new Date(beachRange.start), new Date(beachRange.end), everyone, {
        allDay: true,
        location: '阿那亚',
        notes: '订两晚民宿，看日出。',
        sticker: '🌊',
      }),
    },
    event('妈妈生日', 'birthday', at(addDays(today, 9), 18, 30), at(addDays(today, 9), 21), everyone, {
      location: '家里',
      notes: '果果负责插蜡烛，豆豆负责藏礼物。',
      sticker: '💐',
    }),
    event('豆豆 · 家长会', 'routine', at(nextWeekday(now, 1), 18), at(nextWeekday(now, 1), 19, 30), [dad.id, mom.id], {
      location: '豆豆学校',
      sticker: '📚',
    }),
  ];

  const google: GoogleConfig = {
    clientId: '',
    connectedMemberId: null,
    account: null,
    accountName: null,
    accountPicture: null,
    calendars: { [dad.id]: 'primary', [mom.id]: 'primary' },
    busy: [],
    busyMeta: {},
    demoBusy: true,
    lastSyncAt: null,
  };

  return {
    schemaVersion: 1,
    familyName: '小满一家',
    members,
    events,
    google,
    skin: 'peach',
    customTheme: null,
    stickerMode: true,
    weekStartsOn: 1,
    onboardingSeen: false,
    isSample: true,
    updatedAt: nowIso,
    prefsUpdatedAt: nowIso,
  };
}

// ---------------------------------------------------------------------------
// Deterministic demo busy blocks. Clearly labelled in the UI, never presented
// as real Google data.
// ---------------------------------------------------------------------------

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createDemoBusy(members: Member[], from: Date, days = 14): BusyBlock[] {
  const blocks: BusyBlock[] = [];
  const parents = members.filter((member) => member.role === 'parent');

  for (let offset = 0; offset < days; offset += 1) {
    const day = addDays(startOfDay(from), offset);
    const weekend = day.getDay() === 0 || day.getDay() === 6;

    for (const parent of parents) {
      const random = mulberry32(hashString(`${parent.id}:${day.toISOString().slice(0, 10)}`));
      const push = (startHour: number, startMinute: number, endHour: number, endMinute: number) => {
        blocks.push({
          memberId: parent.id,
          start: iso(at(day, startHour, startMinute)),
          end: iso(at(day, endHour, endMinute)),
          source: 'demo',
        });
      };

      if (weekend) {
        const roll = random();
        if (roll > 0.66) push(10, 0, 12, 0);
        else if (roll > 0.38) push(15, 0, 17, 30);
      } else {
        if (random() > 0.18) push(9, 30, 12, 0);
        if (random() > 0.12) push(13, 30, 18, 0);
        if (random() > 0.82) push(19, 30, 20, 30);
      }
    }
  }
  return blocks;
}
