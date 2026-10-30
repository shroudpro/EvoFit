import { afterEach, describe, expect, it, vi } from 'vitest'
import { requestProvider } from '../../src/api/providerClient'

describe('provider client timeout mapping', () => {
  afterEach(() => vi.restoreAllMocks())

  it('maps a Function upstream timeout to the explicit TIMEOUT error', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'UPSTREAM_TIMEOUT', message: '上游超时' }), { status: 504 }))
    const result = await requestProvider({ purpose: 'chat', input: 'test', responseSchema: {}, consentGranted: true })
    expect(result.status).toBe('timeout')
    expect(result.errorCode).toBe('TIMEOUT')
    expect(result.message).toContain('超时')
  })
})
