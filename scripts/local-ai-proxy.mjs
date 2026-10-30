import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { handler } from '../netlify/functions/ai-proxy.ts'

const envPath = new URL('../.env', import.meta.url)
try {
  const envText = await readFile(envPath, 'utf8')
  for (const line of envText.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#') || !line.includes('=')) continue
    const [key, ...rest] = line.split('=')
    if (key && process.env[key.trim()] === undefined) process.env[key.trim()] = rest.join('=').trim()
  }
} catch {
  // Missing .env is handled by the Function's explicit MODEL_NOT_CONFIGURED response.
}

const port = Number(process.env.FUNCTION_PORT ?? 8888)
const server = createServer(async (request, response) => {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  const result = await handler({ httpMethod: request.method, body: Buffer.concat(chunks).toString('utf8'), headers: request.headers })
  response.writeHead(result.statusCode, result.headers)
  response.end(result.body)
})

server.listen(port, '127.0.0.1', () => console.log(`local-ai-proxy listening on http://127.0.0.1:${port}/.netlify/functions/ai-proxy`))
