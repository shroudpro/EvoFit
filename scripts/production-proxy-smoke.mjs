import { spawn } from 'node:child_process'

const port = Number(process.env.SMOKE_PROXY_PORT ?? 8899)
const baseUrl = `http://127.0.0.1:${port}`
const child = spawn(process.execPath, ['--experimental-strip-types', 'server/ai-proxy.mjs'], {
  cwd: process.cwd(),
  env: { ...process.env, FUNCTION_PORT: String(port), MODEL_API_KEY: 'smoke-test-key' },
  stdio: ['ignore', 'ignore', 'inherit'],
})

async function waitForServer() {
  const deadline = Date.now() + 10_000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/.netlify/functions/ai-proxy`, { method: 'OPTIONS', headers: { Origin: 'http://localhost:5173' } })
      if (response.status === 204) return
    } catch {
      // The child process may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error('PROXY_START_TIMEOUT')
}

async function expectStatus(label, request, expected) {
  const response = await request
  if (response.status !== expected) throw new Error(`${label}: expected ${expected}, got ${response.status}`)
}

try {
  await waitForServer()
  await expectStatus('OPTIONS', fetch(`${baseUrl}/.netlify/functions/ai-proxy`, { method: 'OPTIONS', headers: { Origin: 'http://localhost:5173' } }), 204)
  await expectStatus('consent', fetch(`${baseUrl}/.netlify/functions/ai-proxy`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ purpose: 'parse_exercise', input: '跑步30分钟', consentGranted: false }) }), 403)
  await expectStatus('body limit', fetch(`${baseUrl}/.netlify/functions/ai-proxy`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'x'.repeat(7 * 1024 * 1024 + 1) }), 413)
  console.log(JSON.stringify({ status: 'passed', port }))
} finally {
  child.kill('SIGTERM')
}
