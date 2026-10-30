type Purpose = 'analyze_meal' | 'parse_exercise' | 'weekly_review' | 'chat'
type FunctionEvent = { httpMethod?: string; body?: string | null; headers?: Record<string, string | undefined> }
const ALLOWED_PURPOSES = new Set<Purpose>(['analyze_meal', 'parse_exercise', 'weekly_review', 'chat'])
const WEEKLY_REVIEW_TOOLS = [
  { type: 'function', name: 'get_profile', description: 'Read the already-authorized local profile.', parameters: { type: 'object', properties: { mode: { type: 'string', enum: ['real', 'demo'] } }, required: ['mode'], additionalProperties: false } },
  { type: 'function', name: 'list_meals', description: 'Read meal records from the authorized local mode.', parameters: { type: 'object', properties: { mode: { type: 'string', enum: ['real', 'demo'] }, days: { type: 'integer', minimum: 1, maximum: 30 } }, required: ['mode', 'days'], additionalProperties: false } },
  { type: 'function', name: 'list_exercises', description: 'Read exercise records from the authorized local mode.', parameters: { type: 'object', properties: { mode: { type: 'string', enum: ['real', 'demo'] }, days: { type: 'integer', minimum: 1, maximum: 30 } }, required: ['mode', 'days'], additionalProperties: false } },
  { type: 'function', name: 'analyze_trends', description: 'Read deterministic record-quality statistics for the authorized local mode.', parameters: { type: 'object', properties: { mode: { type: 'string', enum: ['real', 'demo'] }, days: { type: 'integer', minimum: 1, maximum: 30 } }, required: ['mode', 'days'], additionalProperties: false } },
  { type: 'function', name: 'calculate_daily_balance', description: 'Read deterministic daily energy balance calculated locally.', parameters: { type: 'object', properties: { mode: { type: 'string', enum: ['real', 'demo'] } }, required: ['mode'], additionalProperties: false } }
]

const responseSchemas: Record<Purpose, object> = {
  analyze_meal: { type: 'object', properties: { items: { type: 'array', minItems: 1, items: { type: 'object', properties: { foodName: { type: 'string' }, massGrams: { type: 'number', exclusiveMinimum: 0 }, confidenceNote: { type: 'string' } }, required: ['foodName', 'massGrams', 'confidenceNote'], additionalProperties: false } } }, required: ['items'], additionalProperties: false },
  parse_exercise: { type: 'object', properties: { activityCode: { type: 'string', enum: ['treadmill_walk', 'running', 'cycling', 'strength', 'yoga', 'other'] }, activityName: { type: 'string' }, durationMin: { type: ['number', 'null'], exclusiveMinimum: 0 }, speedKmh: { type: ['number', 'null'] }, inclinePercent: { type: ['number', 'null'] }, inclineDegrees: { type: ['number', 'null'] }, intensity: { type: ['string', 'null'], enum: ['light', 'moderate', 'vigorous', null] }, missing: { type: 'array', items: { type: 'string' } } }, required: ['activityCode', 'activityName', 'durationMin', 'speedKmh', 'inclinePercent', 'inclineDegrees', 'intensity', 'missing'], additionalProperties: false },
  weekly_review: { type: 'object', properties: { evidenceQuality: { type: 'string', enum: ['low', 'medium', 'high'] }, rationale: { type: 'string' }, changes: { type: 'array', items: { type: 'object', properties: { field: { type: 'string', enum: ['training.sessions[1].exercises[0].sets'] }, after: { type: 'integer', minimum: 1, maximum: 10 }, reason: { type: 'string' } }, required: ['field', 'after', 'reason'], additionalProperties: false } }, limitations: { type: 'array', items: { type: 'string' } } }, required: ['evidenceQuality', 'rationale', 'changes', 'limitations'], additionalProperties: false }
  ,chat: { type: 'object', properties: { message: { type: 'string' }, toolCalls: { type: 'array' }, proposal: { type: ['object', 'null'] } }, required: ['message', 'toolCalls', 'proposal'], additionalProperties: false }
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs = 15_000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try { return await fetch(input, { ...init, signal: controller.signal }) } finally { clearTimeout(timer) }
}

const rateLimitBuckets = new Map<string, { windowStartedAt: number; requests: number }>()
const DEFAULT_RATE_LIMIT_MAX = 20
const DEFAULT_RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000

function header(headers: Record<string, string | undefined> | undefined, name: string) {
  const wanted = name.toLowerCase()
  return Object.entries(headers ?? {}).find(([key]) => key.toLowerCase() === wanted)?.[1]
}

function getClientKey(headers: Record<string, string | undefined> | undefined) {
  return header(headers, 'x-nf-client-connection-ip') ?? 'unknown'
}

function checkRateLimit(clientKey: string) {
  const max = Number(process.env.MODEL_RATE_LIMIT_MAX ?? DEFAULT_RATE_LIMIT_MAX)
  const windowMs = Number(process.env.MODEL_RATE_LIMIT_WINDOW_MS ?? DEFAULT_RATE_LIMIT_WINDOW_MS)
  const now = Date.now()
  const current = rateLimitBuckets.get(clientKey)
  if (!current || now - current.windowStartedAt >= windowMs) {
    rateLimitBuckets.set(clientKey, { windowStartedAt: now, requests: 1 })
    return { allowed: true, retryAfter: Math.ceil(windowMs / 1000) }
  }
  current.requests += 1
  return { allowed: current.requests <= max, retryAfter: Math.ceil((current.windowStartedAt + windowMs - now) / 1000) }
}

export const handler = async (event: FunctionEvent) => {
  const origin = event.headers?.origin ?? event.headers?.Origin
  const allowedOrigin = process.env.APP_ORIGIN ?? 'http://localhost:5173'
  const allowedOrigins = new Set([allowedOrigin, 'http://127.0.0.1:5173'])
  const respond = (statusCode: number, body: unknown) => json(statusCode, body, origin, allowedOrigins)
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: { ...corsHeaders(origin, allowedOrigins), 'Cache-Control': 'no-store' }, body: '' }
  if (event.httpMethod !== 'POST') return respond(405, { error: 'METHOD_NOT_ALLOWED' })
  const previewToken = process.env.PREVIEW_ACCESS_TOKEN
  if (previewToken && header(event.headers, 'authorization') !== `Bearer ${previewToken}`) return respond(401, { error: 'PREVIEW_AUTH_REQUIRED', message: '受控预览需要访问码。' })
  const rate = checkRateLimit(getClientKey(event.headers))
  if (!rate.allowed) {
    const limited = respond(429, { error: 'RATE_LIMITED', message: '请求过于频繁，请稍后重试。' })
    limited.headers['Retry-After'] = String(rate.retryAfter)
    return limited
  }
  const key = process.env.MODEL_API_KEY ?? process.env.OPENAI_API_KEY
  if (!key) return respond(503, { error: 'MODEL_NOT_CONFIGURED', message: '真实模型未配置，当前可使用本地手工路径。' })
  if (!event.body || event.body.length > 6 * 1024 * 1024) return respond(413, { error: 'REQUEST_TOO_LARGE' })
  let body: { purpose?: Purpose; requestId?: string; input?: unknown; consentGranted?: boolean; responseSchema?: object; tools?: object[] }
  try { body = JSON.parse(event.body) } catch { return respond(400, { error: 'INVALID_JSON' }) }
  if (!body.purpose || !ALLOWED_PURPOSES.has(body.purpose)) return respond(400, { error: 'PURPOSE_NOT_ALLOWED' })
  if (!body.consentGranted) return respond(403, { error: 'CONSENT_REQUIRED' })
  const baseUrl = (process.env.MODEL_BASE_URL ?? process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '')
  if (!/^https:\/\/(api\.openai\.com|api\.sudocode\.chat|trusted-provider\.example)\/v1$/.test(baseUrl)) return respond(400, { error: 'PROVIDER_NOT_ALLOWED' })
  try {
    const tools = body.purpose === 'weekly_review' ? WEEKLY_REVIEW_TOOLS : body.tools
    const requestBody = { model: process.env.MODEL_ID ?? process.env.OPENAI_MODEL ?? 'gpt-6-luna', input: body.input, tools, tool_choice: tools ? 'auto' : undefined, text: { format: { type: 'json_schema', name: body.purpose, strict: true, schema: body.responseSchema ?? responseSchemas[body.purpose] } }, max_output_tokens: 800 }
    const response = await fetchWithTimeout(`${baseUrl}/responses`, { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) })
    if (!response.ok) return respond(response.status === 429 ? 429 : 502, { error: response.status === 429 ? 'RATE_LIMITED' : 'UPSTREAM_ERROR', requestId: body.requestId })
    const payload = await response.json() as unknown
    return respond(200, { requestId: body.requestId, status: 'ok', result: payload })
  } catch { return respond(504, { error: 'UPSTREAM_TIMEOUT', requestId: body.requestId }) }
}

function corsHeaders(origin: string | undefined, allowedOrigins: Set<string>): Record<string, string> { return origin && allowedOrigins.has(origin) ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' } : {} }
function json(statusCode: number, body: unknown, origin?: string, allowedOrigins = new Set([process.env.APP_ORIGIN ?? 'http://localhost:5173', 'http://127.0.0.1:5173'])): { statusCode: number; headers: Record<string, string>; body: string } { return { statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...corsHeaders(origin, allowedOrigins) }, body: JSON.stringify(body) } }
