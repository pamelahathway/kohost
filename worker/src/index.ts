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

// Tier config — synced per /door cycle so other devices pick up Setup-screen
// tier edits within the same 5s window as visitor changes. Last-writer-wins
// by lastModifiedAt.
interface DoorEntryFeeConfig {
  tiers: unknown[]
  lastModifiedAt: number
}

interface DoorState {
  visitors: Record<string, DoorVisitor>
  entryFeeConfig: DoorEntryFeeConfig | null
}

const DOOR_KEY = 'door-visitors'
const DOOR_TTL_SECONDS = 172800 // 48h, matches /backup self-destruct window

async function readDoor(env: Env): Promise<DoorState> {
  const raw = await env.BACKUP_KV.get(DOOR_KEY)
  if (!raw) return { visitors: {}, entryFeeConfig: null }
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { visitors: {}, entryFeeConfig: null }
    }
    // New shape: { visitors: { [id]: visitor }, entryFeeConfig: ... | null }
    if ('visitors' in parsed) {
      const obj = parsed as Record<string, unknown>
      const visitors = (obj.visitors && typeof obj.visitors === 'object' && !Array.isArray(obj.visitors))
        ? obj.visitors as Record<string, DoorVisitor>
        : {}
      const cfgIn = obj.entryFeeConfig as DoorEntryFeeConfig | null | undefined
      const entryFeeConfig =
        cfgIn && Array.isArray(cfgIn.tiers) && typeof cfgIn.lastModifiedAt === 'number'
          ? { tiers: cfgIn.tiers, lastModifiedAt: cfgIn.lastModifiedAt }
          : null
      return { visitors, entryFeeConfig }
    }
    // Legacy shape: bare { [id]: visitor } map — wrap it.
    return { visitors: parsed as Record<string, DoorVisitor>, entryFeeConfig: null }
  } catch {
    return { visitors: {}, entryFeeConfig: null }
  }
}

async function writeDoor(env: Env, state: DoorState): Promise<void> {
  await env.BACKUP_KV.put(DOOR_KEY, JSON.stringify(state), { expirationTtl: DOOR_TTL_SECONDS })
}

function isDoorVisitor(x: unknown): x is DoorVisitor {
  if (!x || typeof x !== 'object') return false
  const v = x as Record<string, unknown>
  return typeof v.id === 'string' && typeof v.updatedAt === 'number'
}

function isDoorEntryFeeConfig(x: unknown): x is DoorEntryFeeConfig {
  if (!x || typeof x !== 'object') return false
  const c = x as Record<string, unknown>
  return Array.isArray(c.tiers) && typeof c.lastModifiedAt === 'number'
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
    if (request.method === 'GET' && url.pathname === '/door') {
      const state = await readDoor(env)
      return new Response(
        JSON.stringify({
          visitors: Object.values(state.visitors),
          entryFeeConfig: state.entryFeeConfig,
          serverTime: Date.now(),
        }),
        { headers: { 'Content-Type': 'application/json', ...cors } }
      )
    }

    // PUT body: { visitors: DoorVisitor[]?, entryFeeConfig: DoorEntryFeeConfig? }.
    // Server reads existing blob, merges per-id (higher updatedAt wins) for
    // visitors, replaces entryFeeConfig only when incoming.lastModifiedAt
    // exceeds stored. Writes back ONLY if something actually changed (free
    // tier KV puts).
    if (request.method === 'PUT' && url.pathname === '/door') {
      let body: unknown
      try {
        body = JSON.parse(await request.text())
      } catch {
        return new Response('Invalid JSON', { status: 400, headers: cors })
      }
      const incomingVisitorsRaw = (body as { visitors?: unknown })?.visitors
      const incomingConfigRaw = (body as { entryFeeConfig?: unknown })?.entryFeeConfig

      const state = await readDoor(env)
      let mutated = false

      if (Array.isArray(incomingVisitorsRaw)) {
        const incoming = incomingVisitorsRaw.filter(isDoorVisitor)
        for (const v of incoming) {
          const existing = state.visitors[v.id]
          if (!existing || v.updatedAt > existing.updatedAt) {
            state.visitors[v.id] = v
            mutated = true
          }
        }
      }

      if (isDoorEntryFeeConfig(incomingConfigRaw)) {
        const stored = state.entryFeeConfig
        if (!stored || incomingConfigRaw.lastModifiedAt > stored.lastModifiedAt) {
          state.entryFeeConfig = incomingConfigRaw
          mutated = true
        }
      }

      if (mutated) {
        await writeDoor(env, state)
      }

      return new Response(
        JSON.stringify({
          ok: true,
          visitors: Object.values(state.visitors),
          entryFeeConfig: state.entryFeeConfig,
          serverTime: Date.now(),
          mutated,
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
