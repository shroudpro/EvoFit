import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db, exportModeBackup, repo } from '../../src/db/database'
import { defaultProviderConfig, providerConfigSummary, validateProviderBaseUrl } from '../../src/shared/providerConfig'
import { profileSchema } from '../../src/shared/schemas'
import { normalizeFunctionEndpoint, requestProvider } from '../../src/api/providerClient'

describe('provider 配置和数据契约', () => {
  beforeEach(async () => { await db.delete(); await db.open() })

  it('keeps browser direct in development and defaults to Function in production', () => {
    expect(defaultProviderConfig('2026-10-30T00:00:00.000Z', false)).toMatchObject({ transport: 'browser_direct', baseUrl: 'http://localhost:3000/v1' })
    expect(defaultProviderConfig('2026-10-30T00:00:00.000Z', true)).toMatchObject({ transport: 'function_proxy', baseUrl: '/.netlify/functions' })
  })

  it('只允许安全的浏览器直连地址', () => {
    expect(validateProviderBaseUrl('https://provider.example/v1')).toBe(true)
    expect(validateProviderBaseUrl('http://localhost:3000/v1')).toBe(true)
    expect(validateProviderBaseUrl('http://127.0.0.1:3000/v1')).toBe(true)
    expect(validateProviderBaseUrl('javascript:alert(1)')).toBe(false)
    expect(validateProviderBaseUrl('file:///secret')).toBe(false)
    expect(validateProviderBaseUrl('http://example.com/v1')).toBe(false)
  })

  it('脱敏摘要绝不包含 API key', () => {
    const summary = providerConfigSummary({ id: 'active', transport: 'browser_direct', protocol: 'responses', baseUrl: 'https://provider.example/v1', model: 'gpt-6-luna', apiKey: 'secret-key', enabled: true, updatedAt: '2026-10-30T00:00:00.000Z' })
    expect(summary).toEqual({ transport: 'browser_direct', protocol: 'responses', baseUrl: 'https://provider.example/v1', model: 'gpt-6-luna', hasApiKey: true, updatedAt: '2026-10-30T00:00:00.000Z' })
    expect(JSON.stringify(summary)).not.toContain('secret-key')
  })

  it('旧 profile 使用安全默认值，新字段严格校验', () => {
    const legacy = { id: 'p', mode: 'real', schemaVersion: 1, createdAt: '2026-10-30', updatedAt: '2026-10-30', ageYears: 22, heightCm: 168, weightKg: 65, goalType: 'fat_loss', exerciseExperience: 'beginner', equipment: 'mixed', timeZone: 'Asia/Shanghai', healthDeclaration: true }
    expect(profileSchema.parse(legacy)).toMatchObject({ activityLevel: 'light', availableMinutesPerDay: 30, healthRiskFlags: [], allergies: [], mealPreferences: [] })
    expect(profileSchema.safeParse({ ...legacy, unknown: true }).success).toBe(false)
    expect(profileSchema.safeParse({ ...legacy, weightKg: 10 }).success).toBe(false)
  })

  it('provider key 不会出现在导出 JSON', async () => {
    await repo.putSetting({ id: 'active', mode: 'real', provider: { id: 'active', transport: 'browser_direct', protocol: 'responses', baseUrl: 'https://provider.example/v1', model: 'gpt-6-luna', apiKey: 'secret-key', enabled: true, updatedAt: '2026-10-30T00:00:00.000Z' }, updatedAt: '2026-10-30T00:00:00.000Z' })
    const backup = await exportModeBackup('real')
    expect(JSON.stringify(backup)).not.toContain('secret-key')
    expect(backup.provider).toMatchObject({ hasApiKey: true, model: 'gpt-6-luna' })
  })

  it('distinguishes a stopped local Function from browser-direct CORS failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    const functionResult = await requestProvider({ purpose: 'chat', input: 'ping', responseSchema: {}, consentGranted: true, config: { id: 'active', transport: 'function_proxy', protocol: 'responses', baseUrl: 'http://localhost:8888/.netlify/functions', model: 'gpt-6-luna', apiKey: '', enabled: true, updatedAt: '2026-10-30T00:00:00.000Z' } })
    expect(functionResult.errorCode).toBe('LOCAL_FUNCTION_UNAVAILABLE')
    expect(functionResult.message).toContain('8888')
    const directResult = await requestProvider({ purpose: 'chat', input: 'ping', responseSchema: {}, consentGranted: true, config: { id: 'active', transport: 'browser_direct', protocol: 'responses', baseUrl: 'https://provider.example/v1', model: 'gpt-6-luna', apiKey: 'key', enabled: true, updatedAt: '2026-10-30T00:00:00.000Z' } })
    expect(directResult.errorCode).toBe('CORS_OR_NETWORK')
    expect(directResult.message).toContain('CORS')
  })

  it('normalizes localhost Function URLs to the IPv4 listener', () => {
    expect(normalizeFunctionEndpoint('http://localhost:8888/.netlify/functions')).toBe('http://127.0.0.1:8888/.netlify/functions')
    expect(normalizeFunctionEndpoint('http://127.0.0.1:8888/.netlify/functions')).toBe('http://127.0.0.1:8888/.netlify/functions')
    expect(normalizeFunctionEndpoint('/.netlify/functions')).toBe('/.netlify/functions')
  })
})
