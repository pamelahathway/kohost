interface Env {
  BACKUP_KV: KVNamespace
  BACKUP_SECRET: string
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

    // Debug endpoint — test KV read/write directly
    if (request.method === 'GET' && url.pathname === '/debug') {
      try {
        await env.BACKUP_KV.put('_test', 'hello', { expirationTtl: 60 })
        const val = await env.BACKUP_KV.get('_test')
        const latest = await env.BACKUP_KV.get('latest')
        return new Response(JSON.stringify({
          testWrite: 'ok',
          testRead: val,
          latestExists: latest !== null,
          latestLength: latest?.length ?? 0,
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
