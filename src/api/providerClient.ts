import { repo } from '../db/database'
import { defaultProviderConfig, validateProviderBaseUrl, type ProviderConfig } from '../shared/providerConfig'
import type { Mode } from '../shared/types'

export type ProviderPurpose = 'analyze_meal' | 'parse_exercise' | 'weekly_review' | 'chat'
export interface ProviderRequest { purpose: ProviderPurpose; input: unknown; responseSchema: object; tools?: object[]; consentGranted: boolean; mode?: Mode; config?: ProviderConfig; signal?: AbortSignal }
export type ProviderResponseStatus = 'connected' | 'unconfigured' | 'failed' | 'rate_limited' | 'timeout'
export interface ProviderResponse { status: ProviderResponseStatus; payload?: unknown; message: string; errorCode?: string; httpStatus?: number }

const REQUEST_TIMEOUT_MS = 15_000

export function normalizeFunctionEndpoint(endpoint: string) {
  try {
    const url = new URL(endpoint)
    if (url.protocol === 'http:' && url.hostname.toLowerCase() === 'localhost') url.hostname = '127.0.0.1'
    return url.toString().replace(/\/$/, '')
  } catch { return endpoint.replace(/\/$/, '') }
}
function functionEndpoint() { return `${normalizeFunctionEndpoint(import.meta.env.VITE_API_BASE_URL || '/.netlify/functions')}/ai-proxy` }
function responsesEndpoint(baseUrl: string) { return `${baseUrl.replace(/\/$/, '').replace(/\/responses$/, '')}/responses` }
function localFunctionEndpoint(endpoint: string) { return /^https?:\/\/(localhost|127\.0\.0\.1):\d+/i.test(endpoint) }
function headersFor(config: ProviderConfig, direct: boolean): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (direct && config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`
  if (!direct && typeof sessionStorage !== 'undefined') { const token = sessionStorage.getItem('evofit-preview-token'); if (token) headers.Authorization = `Bearer ${token}` }
  return headers
}
function messageFor(status: number, errorCode?: string) {
  if (status === 401 || status === 403) return '模型鉴权失败，请检查连接方式或访问码。'
  if (status === 404) return '模型地址不存在，请检查 API Base URL。'
  if (status === 413) return '发送内容过大，已回到手工路径。'
  if (status === 429) return '模型请求受到限流，请稍后重试。'
  if (status >= 500) return '模型服务暂时不可用，已回到手工路径。'
  return errorCode ? `模型请求失败：${errorCode}。` : `模型请求失败（${status}）。`
}

export async function requestProvider(request: ProviderRequest): Promise<ProviderResponse> {
  if (!request.consentGranted) return { status: 'failed', errorCode: 'CONSENT_REQUIRED', message: '发送模型前需要你的明确同意；数据仍保留在本机。' }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { status: 'failed', errorCode: 'MODEL_UNAVAILABLE', message: '当前处于离线状态，AI 暂不可用；手工记录仍可继续。' }
  const stored = request.config ?? (request.mode ? (await repo.getSetting(request.mode))?.provider : undefined)
  // Legacy modelAdapter calls without a mode continue through the controlled Function.
  // A mode-scoped request must have an explicit saved provider configuration.
  const config = stored ?? { ...defaultProviderConfig(), transport: 'function_proxy' as const, enabled: true }
  const direct = config.transport === 'browser_direct'
  if (direct && (!config.enabled || !config.apiKey || !validateProviderBaseUrl(config.baseUrl))) return { status: 'unconfigured', errorCode: 'MODEL_UNAVAILABLE', message: '本地 provider 未配置完整；已回到手工路径。' }
  if (!direct && !config.enabled && request.config) return { status: 'unconfigured', errorCode: 'MODEL_UNAVAILABLE', message: 'Function provider 未启用；已回到手工路径。' }
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  const signal = request.signal ? AbortSignal.any([controller.signal, request.signal]) : controller.signal
  const body = direct
    ? { model: config.model, input: request.input, tools: request.tools, text: { format: { type: 'json_schema', name: request.purpose, strict: true, schema: request.responseSchema } }, max_output_tokens: 800 }
    : { purpose: request.purpose, input: request.input, responseSchema: request.responseSchema, tools: request.tools, consentGranted: request.consentGranted, requestId: crypto.randomUUID() }
  try {
    const response = await fetch(direct ? responsesEndpoint(config.baseUrl) : functionEndpoint(), { method: 'POST', headers: headersFor(config, direct), body: JSON.stringify(body), signal })
    const payload = await response.json().catch(() => undefined) as { result?: unknown; error?: string; message?: string }
    if (!response.ok) return { status: response.status === 429 ? 'rate_limited' : 'failed', errorCode: response.status === 429 ? 'RATE_LIMITED' : payload?.error === 'INVALID_JSON' ? 'INVALID_SCHEMA' : payload?.error ?? 'MODEL_UNAVAILABLE', httpStatus: response.status, message: payload?.message ?? messageFor(response.status, payload?.error) }
    return { status: 'connected', payload: direct ? payload : payload?.result, message: '真实模型已返回结果。', httpStatus: response.status }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return { status: 'timeout', errorCode: 'TIMEOUT', message: '模型请求超时，已回到手工路径。' }
    if (error instanceof TypeError && /failed to fetch|networkerror|load failed/i.test(error.message)) {
      if (!direct && localFunctionEndpoint(functionEndpoint())) return { status: 'failed', errorCode: 'LOCAL_FUNCTION_UNAVAILABLE', message: `本地 Function 无法连接：${functionEndpoint()}。请先运行 npm run dev:function，或切换到浏览器直连。` }
      if (direct) return { status: 'failed', errorCode: 'CORS_OR_NETWORK', message: '浏览器直连失败，通常是 provider 未开启 CORS 或网络不可达；可切换到受控 Function 模式。' }
    }
    return { status: 'failed', errorCode: 'MODEL_UNAVAILABLE', message: error instanceof Error ? `模型连接失败：${error.message}` : '模型连接失败，已回到手工路径。' }
  } finally { clearTimeout(timeout) }
}

export async function testProviderConnection(config: ProviderConfig): Promise<ProviderResponse> {
  return requestProvider({ purpose: 'chat', input: 'Respond with a short connection check.', responseSchema: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'], additionalProperties: false }, consentGranted: true, config: { ...config, enabled: true } })
}
