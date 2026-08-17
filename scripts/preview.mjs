/**
 * Serves ./out under the production basePath, so deployment problems surface
 * locally rather than on Pages. PRD §12.
 */
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, extname, normalize } from 'node:path'

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '/cangkok'
const PORT = Number(process.env.PORT ?? 4321)
const ROOT = new URL('../out/', import.meta.url).pathname

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}

async function resolveFile(pathname) {
  // Next writes chunk files under the literal route segment name, brackets
  // and all (app/[locale]/repo/page-*.js) — but a browser request for that
  // asset arrives percent-encoded (%5Blocale%5D), so the lookup has to
  // decode before it ever reaches the filesystem or every dynamic-route
  // page's script 404s and the page silently never hydrates.
  const decoded = decodeURIComponent(pathname)
  const candidate = join(ROOT, normalize(decoded).replace(/^(\.\.[/\\])+/, ''))
  try {
    const info = await stat(candidate)
    if (info.isDirectory()) return join(candidate, 'index.html')
    return candidate
  } catch {
    return `${candidate.replace(/\/$/, '')}.html`
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost')
  if (!url.pathname.startsWith(BASE_PATH)) {
    res.writeHead(302, { location: `${BASE_PATH}/` })
    res.end()
    return
  }
  const file = await resolveFile(url.pathname.slice(BASE_PATH.length) || '/')
  try {
    const body = await readFile(file)
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    res.end(`404 ${url.pathname}`)
  }
}).listen(PORT, () => {
  console.log(`preview: http://localhost:${PORT}${BASE_PATH}/`)
})
