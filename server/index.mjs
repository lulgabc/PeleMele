#!/usr/bin/env node
/**
 * PeleMele family sync — a tiny, dependency-free room server.
 *
 *   node server/index.mjs --port 8787 --data ./server/data
 *
 * Rooms are protected by a family key. The server stores only a scrypt hash of
 * the key plus the calendar snapshot. Google tokens never reach this process.
 */
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index !== -1 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const PORT = Number(arg('port', process.env.PORT ?? 8787));
const HOST = arg('host', process.env.HOST ?? '0.0.0.0');
const DATA_DIR = path.resolve(arg('data', process.env.DATA_DIR ?? path.join(here, 'data')));
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? '*';
const MAX_BODY = 5 * 1024 * 1024;
const ROOM_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{2,47}$/;
const KEY_MIN = 6;

const MIME = { 'content-type': 'application/json; charset=utf-8' };

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.setHeader('Access-Control-Allow-Headers', 'content-type, x-family-key');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function send(res, status, payload) {
  cors(res);
  res.writeHead(status, MIME);
  res.end(JSON.stringify(payload));
}

function log(method, pathname, status, note = '') {
  const stamp = new Date().toISOString();
  console.log(`${stamp} ${method} ${pathname} ${status}${note ? ` ${note}` : ''}`);
}

async function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('请求体太大'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(Object.assign(new Error('JSON 格式不对'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function hashKey(key, salt) {
  return crypto.scryptSync(key, salt, 32, { N: 16384, r: 8, p: 1 }).toString('hex');
}

function verifyKey(key, record) {
  if (!key || !record?.key?.salt || !record?.key?.hash) return false;
  const actual = Buffer.from(hashKey(key, record.key.salt), 'hex');
  const expected = Buffer.from(record.key.hash, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function roomFile(room) {
  return path.join(DATA_DIR, `${room}.json`);
}

async function readRoom(room) {
  try {
    const raw = await fs.readFile(roomFile(room), 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function writeRoom(room, record) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const file = roomFile(room);
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temp, JSON.stringify(record), { mode: 0o600 });
  await fs.rename(temp, file);
}

function makeRecord(state, key, revision) {
  const salt = crypto.randomBytes(16).toString('hex');
  return {
    revision,
    key: { salt, hash: hashKey(key, salt) },
    state,
    updatedAt: new Date().toISOString(),
  };
}

function landing() {
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>PeleMele Sync</title>
<style>
body{font-family:-apple-system,"PingFang SC",sans-serif;background:#FFF5E9;color:#2F2438;margin:0;padding:48px 20px;line-height:1.65}
main{max-width:680px;margin:0 auto;background:#FFFCF6;border:1px solid rgba(47,36,56,.13);border-radius:28px;padding:32px}
h1{font-size:32px;margin:0 0 6px}p{color:#7B6B7D}code,pre{background:#F7EDE1;border-radius:10px;padding:2px 6px;font-size:13px}
pre{padding:14px;overflow:auto}li{margin:6px 0}em{color:#16B893;font-style:normal;font-weight:700}
</style></head><body><main>
<h1>🎈 PeleMele Sync</h1>
<p>一个只属于你家的日历同步小服务。零依赖，数据存在本机。</p>
<p><strong>状态：</strong><em>运行中</em> · 端口 ${PORT}</p>
<h2 style="font-size:18px;margin-top:28px">怎么用</h2>
<ol>
<li>在 PeleMele 的「设置 → 家庭同步」里填这个地址：<code>http://你的主机:${PORT}</code></li>
<li>设置家庭码和至少 6 位的家庭密钥，点击「保存并同步」。</li>
<li>其他家人的设备填同样的地址、家庭码和密钥即可。</li>
</ol>
<p>服务端只保存日历快照与密钥的 scrypt 哈希，不保存 Google token。</p>
<pre>GET  /health
GET  /api/rooms/:room   (x-family-key)
PUT  /api/rooms/:room   (x-family-key, {baseRevision, state})</pre>
<p style="font-size:12px;color:#A2909F">Self-host it on a NAS, a Raspberry Pi, or any Node 20+ box.</p>
</main></body></html>`;
}

const server = http.createServer(async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname);

  try {
    if (req.method === 'GET' && pathname === '/health') {
      send(res, 200, { ok: true, service: 'pelemele-sync', version: 1 });
      log(req.method, pathname, 200);
      return;
    }

    if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
      cors(res);
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(landing());
      log(req.method, pathname, 200);
      return;
    }

    if (pathname.startsWith('/api/rooms/')) {
      const room = pathname.slice('/api/rooms/'.length);
      if (!ROOM_RE.test(room)) {
        send(res, 400, { error: 'invalid_room', message: '家庭码只能包含字母、数字、- 和 _，长度 3–48。' });
        log(req.method, pathname, 400);
        return;
      }

      const key = req.headers['x-family-key'];
      if (typeof key !== 'string' || key.length < KEY_MIN) {
        send(res, 401, { error: 'missing_key', message: '缺少家庭密钥（至少 6 位）。' });
        log(req.method, pathname, 401);
        return;
      }

      if (req.method === 'GET') {
        const record = await readRoom(room);
        if (!record) {
          send(res, 404, { error: 'not_found', message: '这个家庭空间还没有创建，先同步一次就会创建。' });
          log(req.method, pathname, 404);
          return;
        }
        if (!verifyKey(key, record)) {
          send(res, 403, { error: 'bad_key', message: '家庭密钥不对。' });
          log(req.method, pathname, 403);
          return;
        }
        send(res, 200, { revision: record.revision, state: record.state, updatedAt: record.updatedAt });
        log(req.method, pathname, 200, `rev=${record.revision}`);
        return;
      }

      if (req.method === 'PUT') {
        const body = await readJson(req);
        if (!body || typeof body !== 'object' || typeof body.baseRevision !== 'number' || !body.state || typeof body.state !== 'object') {
          send(res, 400, { error: 'bad_body', message: '需要 { baseRevision, state }。' });
          log(req.method, pathname, 400);
          return;
        }

        const existing = await readRoom(room);
        if (!existing) {
          if (body.baseRevision !== 0) {
            send(res, 409, { error: 'missing', revision: 0, message: '空间不存在，请先拉取或从 revision 0 创建。' });
            log(req.method, pathname, 409);
            return;
          }
          const record = makeRecord(body.state, key, 1);
          await writeRoom(room, record);
          send(res, 201, { revision: record.revision, updatedAt: record.updatedAt });
          log(req.method, pathname, 201, 'created');
          return;
        }

        if (!verifyKey(key, existing)) {
          send(res, 403, { error: 'bad_key', message: '家庭密钥不对。' });
          log(req.method, pathname, 403);
          return;
        }

        if (body.baseRevision !== existing.revision) {
          send(res, 409, {
            error: 'conflict',
            revision: existing.revision,
            state: existing.state,
            updatedAt: existing.updatedAt,
            message: '另一端先更新了，请合并后再试。',
          });
          log(req.method, pathname, 409, `conflict rev=${existing.revision}`);
          return;
        }

        const updated = {
          ...existing,
          revision: existing.revision + 1,
          state: body.state,
          updatedAt: new Date().toISOString(),
        };
        await writeRoom(room, updated);
        send(res, 200, { revision: updated.revision, updatedAt: updated.updatedAt });
        log(req.method, pathname, 200, `rev=${updated.revision}`);
        return;
      }

      send(res, 405, { error: 'method_not_allowed', message: '只支持 GET / PUT。' });
      log(req.method, pathname, 405);
      return;
    }

    send(res, 404, { error: 'not_found', message: '没有这个接口。' });
    log(req.method, pathname, 404);
  } catch (error) {
    const status = error.status ?? 500;
    send(res, status, { error: 'server_error', message: error.status ? error.message : '服务器出错了，请查看日志。' });
    log(req.method, pathname, status, error.message);
  }
});

await fs.mkdir(DATA_DIR, { recursive: true });
server.listen(PORT, HOST, () => {
  console.log(`PeleMele sync listening on http://${HOST}:${PORT}`);
  console.log(`Data: ${DATA_DIR}`);
});
