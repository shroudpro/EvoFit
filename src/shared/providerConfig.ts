import type { SettingRecord } from './types'

export type ProviderTransport = 'browser_direct' | 'function_proxy'
export type ProviderProtocol = 'responses'

export interface ProviderConfig {
  id: 'active'
  transport: ProviderTransport
  protocol: ProviderProtocol
  baseUrl: string
  model: string
  apiKey: string
  enabled: boolean
  updatedAt: string
}

export interface ProviderConfigSummary {
  transport: ProviderTransport
  protocol: ProviderProtocol
  baseUrl: string
  model: string
  hasApiKey: boolean
  updatedAt: string
}

export function defaultProviderConfig(now = new Date().toISOString(), production = Boolean(import.meta.env.PROD)): ProviderConfig {
  return { id: 'active', transport: production ? 'function_proxy' : 'browser_direct', protocol: 'responses', baseUrl: production ? '/.netlify/functions' : 'http://localhost:3000/v1', model: 'gpt-6-luna', apiKey: '', enabled: production, updatedAt: now }
}

export function validateProviderBaseUrl(value: string): boolean {
  try {
    const url = new URL(value)
    if (url.protocol === 'https:') return Boolean(url.host)
    return url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1') && Boolean(url.host)
  } catch { return false }
}

export function providerConfigSummary(config: ProviderConfig): ProviderConfigSummary {
  return { transport: config.transport, protocol: config.protocol, baseUrl: config.baseUrl, model: config.model, hasApiKey: Boolean(config.apiKey), updatedAt: config.updatedAt }
}

export function sanitizeSetting(setting: SettingRecord | undefined): Omit<SettingRecord, 'provider'> & { provider?: ProviderConfigSummary } | undefined {
  if (!setting) return undefined
  return { ...setting, provider: setting.provider ? providerConfigSummary(setting.provider) : undefined }
}
