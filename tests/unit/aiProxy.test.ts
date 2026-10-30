import { afterEach, describe, expect, it, vi } from 'vitest'
import { handler } from '../../netlify/functions/ai-proxy'

describe('受控 AI Function', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs() })

  it('returns CORS headers only for the local allowed origin', async () => {
    const result = await handler({ httpMethod: 'OPTIONS', headers: { origin: 'http://127.0.0.1:5173' }, body: '' })
    expect(result.statusCode).toBe(204)
    expect(result.headers['Access-Control-Allow-Origin']).toBe('http://127.0.0.1:5173')
  })

  it('rejects requests without consent before contacting the provider', async () => {
    vi.stubEnv('MODEL_API_KEY', 'test-key')
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const result = await handler({ httpMethod: 'POST', headers: { origin: 'http://localhost:5173' }, body: JSON.stringify({ purpose: 'weekly_review', input: 'x', consentGranted: false }) })
    expect(result.statusCode).toBe(403)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('adds only the server-owned weekly review tools to upstream requests', async () => {
    vi.stubEnv('MODEL_API_KEY', 'test-key')
    vi.stubEnv('MODEL_BASE_URL', 'https://api.sudocode.chat/v1')
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ output_text: JSON.stringify({ evidenceQuality: 'medium', rationale: 'x', changes: [], limitations: [] }) }), { status: 200 }))
    const result = await handler({ httpMethod: 'POST', headers: { origin: 'http://localhost:5173' }, body: JSON.stringify({ purpose: 'weekly_review', input: 'x', consentGranted: true, tools: [{ type: 'function', name: 'apply_plan' }] }) })
    expect(result.statusCode).toBe(200)
    const body = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body)) as { tools?: Array<{ name: string }> }
    expect(body.tools?.map((tool) => tool.name)).toContain('analyze_trends')
    expect(body.tools?.map((tool) => tool.name)).not.toContain('apply_plan')
  })

  it('returns a timeout response when the upstream provider aborts', async () => {
    vi.stubEnv('MODEL_API_KEY', 'test-key')
    vi.stubEnv('MODEL_BASE_URL', 'https://api.sudocode.chat/v1')
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new DOMException('aborted', 'AbortError'))
    const result = await handler({ httpMethod: 'POST', headers: { origin: 'http://localhost:5173' }, body: JSON.stringify({ purpose: 'parse_exercise', input: '跑步 30 分钟', consentGranted: true }) })
    expect(result.statusCode).toBe(504)
    expect(JSON.parse(result.body).error).toBe('UPSTREAM_TIMEOUT')
  })

  it('requires the server-side preview token when configured', async () => {
    vi.stubEnv('MODEL_API_KEY', 'test-key')
    vi.stubEnv('PREVIEW_ACCESS_TOKEN', 'preview-secret')
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const result = await handler({ httpMethod: 'POST', headers: { origin: 'http://localhost:5173', 'x-nf-client-connection-ip': '198.51.100.10' }, body: JSON.stringify({ purpose: 'parse_exercise', input: '跑步 30 分钟', consentGranted: true }) })
    expect(result.statusCode).toBe(401)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('limits repeated requests on the server', async () => {
    vi.stubEnv('MODEL_API_KEY', 'test-key')
    vi.stubEnv('MODEL_BASE_URL', 'https://api.sudocode.chat/v1')
    vi.stubEnv('MODEL_RATE_LIMIT_MAX', '1')
    vi.stubEnv('MODEL_RATE_LIMIT_WINDOW_MS', '60000')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ output_text: '{}' }), { status: 200 }))
    const headers = { origin: 'http://localhost:5173', 'x-nf-client-connection-ip': '198.51.100.11' }
    const body = JSON.stringify({ purpose: 'parse_exercise', input: '跑步 30 分钟', consentGranted: true })
    expect((await handler({ httpMethod: 'POST', headers, body })).statusCode).toBe(200)
    const limited = await handler({ httpMethod: 'POST', headers, body })
    expect(limited.statusCode).toBe(429)
    expect(limited.headers['Retry-After']).toBeDefined()
  })
})
