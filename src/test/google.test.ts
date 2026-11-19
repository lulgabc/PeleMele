import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchGoogleBusy } from '../lib/google';

const start = new Date('2026-11-20T00:00:00.000Z');
const end = new Date('2026-11-27T00:00:00.000Z');

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Google free/busy', () => {
  it('maps busy intervals to members', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          calendars: {
            primary: {
              busy: [
                { start: '2026-11-20T09:00:00Z', end: '2026-11-20T10:00:00Z' },
                { start: '2026-11-21T14:00:00Z', end: '2026-11-21T15:30:00Z' },
              ],
            },
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const blocks = await fetchGoogleBusy('token-123', [{ memberId: 'm-dad', calendarId: 'primary' }], start, end);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ memberId: 'm-dad', source: 'google' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://www.googleapis.com/calendar/v3/freeBusy');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer token-123');
    const body = JSON.parse(init.body as string);
    expect(body.items).toEqual([{ id: 'primary' }]);
    expect(body.timeMin).toBe(start.toISOString());
    expect(body.timeMax).toBe(end.toISOString());
  });

  it('surfaces expired authorization clearly', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })));
    await expect(
      fetchGoogleBusy('expired', [{ memberId: 'm-mom', calendarId: 'primary' }], start, end),
    ).rejects.toThrow('授权已过期');
  });

  it('reports calendar permission errors when no busy data comes back', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ calendars: { primary: { errors: [{ reason: 'notFound' }] } } }), {
          status: 200,
        }),
      ),
    );
    await expect(
      fetchGoogleBusy('token', [{ memberId: 'm-mom', calendarId: 'primary' }], start, end),
    ).rejects.toThrow('没有读到空闲信息');
  });
});
