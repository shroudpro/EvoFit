import { createServer } from 'node:http'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { handler } from '../netlify/functions/ai-proxy.ts'

const MAX_BODY_BYTES = 7 * 1024 * 1024

function normalizeHeaders(headers) {
  return Object.fromEntries(Object.entries(headers).map(([name, value]) => [name, Array.isArray(value) ? value.join(',') : value]))
}

function writeResponse(response, result) {
  response.writeHead(result.statusCode, result.headers)
  response.end(result.body)
}

function writeTooLarge(response) {
  writeResponse(response, { statusCode: 413, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify({ error: 'REQUEST_TOO_LARGE' }) })
}

export function createProxyServer() {
  return createServer(async (request, response) => {
    const declaredLength = Number(request.headers['content-length'] ?? 0)
    if (declaredLength > MAX_BODY_BYTES) {
      request.resume()
      writeTooLarge(response)
      return
    }

    const chunks = []
    let size = 0
    try {
      for await (const chunk of request) {
        size += chunk.length
        if (size > MAX_BODY_BYTES) {
          request.destroy()
          writeTooLarge(response)
          return
        }
        chunks.push(chunk)
      }
      const result = await handler({
        httpMethod: request.method,
        body: Buffer.concat(chunks).toString('utf8'),
        headers: normalizeHeaders(request.headers),
      })
      writeResponse(response, result)
    } catch {
      if (!response.writableEnded) writeResponse(response, { statusCode: 500, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify({ error: 'PROXY_INTERNAL_ERROR' }) })
    }
  })
}

export function startProxyServer(port = Number(process.env.FUNCTION_PORT ?? 8888)) {
  const server = createProxyServer()
  server.listen(port, '127.0.0.1', () => console.log(`evofit-ai-proxy listening on http://127.0.0.1:${port}`))
  return server
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
if (isMain) {
  const server = startProxyServer()
  const shutdown = () => server.close(() => process.exit(0))
  process.once('SIGTERM', shutdown)
  process.once('SIGINT', shutdown)
}
