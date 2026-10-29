type Purpose = 'analyze_meal' | 'parse_exercise' | 'coach_turn' | 'weekly_review'
const ALLOWED_PURPOSES = new Set<Purpose>(['analyze_meal', 'parse_exercise', 'coach_turn', 'weekly_review'])

export const handler = async (event: { httpMethod?: string; body?: string | null }) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'METHOD_NOT_ALLOWED' })
  const key = process.env.MODEL_API_KEY ?? process.env.OPENAI_API_KEY
  if (!key) return json(503, { error: 'MODEL_NOT_CONFIGURED', message: '真实模型未配置，当前可使用本地手工路径。' })
  let body: { purpose?: Purpose; requestId?: string; model?: string; input?: unknown; consentGranted?: boolean }
  try { body = JSON.parse(event.body ?? '{}') } catch { return json(400, { error: 'INVALID_JSON' }) }
  if (!body.purpose || !ALLOWED_PURPOSES.has(body.purpose)) return json(400, { error: 'PURPOSE_NOT_ALLOWED' })
  if (!body.consentGranted) return json(403, { error: 'CONSENT_REQUIRED' })
  const baseUrl = process.env.MODEL_BASE_URL ?? process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1'
  if (!/^https:\/\/(api\.openai\.com|api\.sudocode\.chat|trusted-provider\.example)\//.test(baseUrl)) return json(400, { error: 'PROVIDER_NOT_ALLOWED' })
  try {
    const response = await fetch(`${baseUrl}/responses`, { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: body.model ?? process.env.MODEL_ID ?? process.env.OPENAI_MODEL ?? 'gpt-6-luna', input: body.input }) })
    if (!response.ok) return json(response.status === 429 ? 429 : 502, { error: response.status === 429 ? 'RATE_LIMITED' : 'UPSTREAM_ERROR', requestId: body.requestId })
    const payload = await response.json() as unknown
    return json(200, { requestId: body.requestId, status: 'ok', result: payload })
  } catch { return json(504, { error: 'UPSTREAM_TIMEOUT', requestId: body.requestId }) }
}
function json(statusCode: number, body: unknown) { return { statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) } }
