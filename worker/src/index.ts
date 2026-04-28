interface Env {
  BACKUP_KV: KVNamespace
  BACKUP_SECRET: string
}

// Door visitor record — kept in plaintext on the worker so it can merge per-id
// by updatedAt. The /backup endpoint remains end-to-end encrypted; /door does
// not (the secret-gated transport is the only privacy layer for live sync).
interface DoorVisitor {
  id: string
  updatedAt: number
  // All other fields treated as opaque payload
  [k: string]: unknown
}

const DOOR_KEY = 'door-visitors'
const DOOR_TTL_SECONDS = 172800 // 48h, matches /backup self-destruct window

async function readDoor(env: Env): Promise<Record<string, DoorVisitor>> {
  const raw = await env.BACKUP_KV.get(DOOR_KEY)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, DoorVisitor>
    }
    return {}
  } catch {
    return {}
  }
}

async function writeDoor(env: Env, map: Record<string, DoorVisitor>): Promise<void> {
  await env.BACKUP_KV.put(DOOR_KEY, JSON.stringify(map), { expirationTtl: DOOR_TTL_SECONDS })
}

function isDoorVisitor(x: unknown): x is DoorVisitor {
  if (!x || typeof x !== 'object') return false
  const v = x as Record<string, unknown>
  return typeof v.id === 'string' && typeof v.updatedAt === 'number'
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Backup-Secret',
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors })
    }

    // Auth check
    const secret = request.headers.get('X-Backup-Secret')
    if (!secret || secret !== env.BACKUP_SECRET) {
      return new Response('Unauthorized', { status: 401, headers: cors })
    }

    const url = new URL(request.url)

    // ---------- Backup (existing, unchanged) ----------
    if (request.method === 'PUT' && url.pathname === '/backup') {
      const body = await request.text()
      // Validate it's parseable JSON
      try {
        JSON.parse(body)
      } catch {
        return new Response('Invalid JSON', { status: 400, headers: cors })
      }
      // Auto-expire after 48 hours — data self-destructs after the event
      await env.BACKUP_KV.put('latest', body, { expirationTtl: 172800 })
      return new Response(JSON.stringify({ ok: true, savedAt: new Date().toISOString() }), {
        headers: { 'Content-Type': 'application/json', ...cors },
      })
    }

    if (request.method === 'GET' && url.pathname === '/backup') {
      const data = await env.BACKUP_KV.get('latest')
      if (!data) {
        return new Response('No backup found', { status: 404, headers: cors })
      }
      return new Response(data, {
        headers: { 'Content-Type': 'application/json', ...cors },
      })
    }

    // ---------- Door sync ----------
    // Returns the current visitors map plus server time so clients can detect
    // clock skew. Visitors are returned as a plain array for client convenience.
    if (request.method === 'GET' && url.pathname === '/door') {
      const map = await readDoor(env)
      return new Response(
        JSON.stringify({ visitors: Object.values(map), serverTime: Date.now() }),
        { headers: { 'Content-Type': 'application/json', ...cors } }
      )
    }

    // PUT body: { visitors: DoorVisitor[] }. Server reads existing blob, merges
    // each incoming record by id (higher updatedAt wins), writes back. Tiny race
    // window between read and write — acceptable for ~4 devices polling 5s. If
    // a write loses, the client re-PUTs on next cycle (always sends full local).
    if (request.method === 'PUT' && url.pathname === '/door') {
      let body: unknown
      try {
        body = JSON.parse(await request.text())
      } catch {
        return new Response('Invalid JSON', { status: 400, headers: cors })
      }
      const incomingRaw = (body as { visitors?: unknown })?.visitors
      if (!Array.isArray(incomingRaw)) {
        return new Response('Missing visitors array', { status: 400, headers: cors })
      }

      const incoming = incomingRaw.filter(isDoorVisitor)
      const map = await readDoor(env)
      for (const v of incoming) {
        const existing = map[v.id]
        if (!existing || v.updatedAt > existing.updatedAt) {
          map[v.id] = v
        }
      }
      await writeDoor(env, map)

      return new Response(
        JSON.stringify({
          ok: true,
          visitors: Object.values(map),
          serverTime: Date.now(),
        }),
        { headers: { 'Content-Type': 'application/json', ...cors } }
      )
    }

    // Debug endpoint — test KV read/write directly
    if (request.method === 'GET' && url.pathname === '/debug') {
      try {
        await env.BACKUP_KV.put('_test', 'hello', { expirationTtl: 60 })
        const val = await env.BACKUP_KV.get('_test')
        const latest = await env.BACKUP_KV.get('latest')
        const door = await env.BACKUP_KV.get(DOOR_KEY)
        return new Response(JSON.stringify({
          testWrite: 'ok',
          testRead: val,
          latestExists: latest !== null,
          latestLength: latest?.length ?? 0,
          doorExists: door !== null,
          doorLength: door?.length ?? 0,
        }), { headers: { 'Content-Type': 'application/json', ...cors } })
      } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), {
          status: 500, headers: { 'Content-Type': 'application/json', ...cors },
        })
      }
    }

    return new Response('Not found', { status: 404, headers: cors })
  },
}
