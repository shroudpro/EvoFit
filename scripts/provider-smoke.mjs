import { readFile } from 'node:fs/promises'

const envText = await readFile('.env', 'utf8')
const env = Object.fromEntries(envText.split(/\r?\n/).filter((line) => line && !line.trim().startsWith('#') && line.includes('=')).map((line) => {
  const [key, ...rest] = line.split('=')
  return [key.trim(), rest.join('=').trim()]
}))
const key = env.OPENAI_API_KEY || env.MODEL_API_KEY
const base = (env.OPENAI_BASE_URL || env.MODEL_BASE_URL || '').replace(/\/$/, '')
const model = env.OPENAI_MODEL || env.MODEL_ID || 'gpt-6-luna'
const result = { model, baseUrl: base ? `${base.slice(0, 28)}…` : '(missing)', tests: {} }
if (!key || !base) {
  result.status = 'not_run'
  result.reason = 'Missing API key or base URL in .env'
  console.log(JSON.stringify(result, null, 2))
  process.exit(0)
}

const headers = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
const post = async (path, body) => {
  try {
    const response = await fetch(`${base}${path}`, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(45_000) })
    const text = await response.text()
    let payload = null
    try { payload = JSON.parse(text) } catch { /* response shape is recorded below */ }
    return { status: response.status, ok: response.ok, payload, contentType: response.headers.get('content-type') || '' }
  } catch (error) {
    return { status: 0, ok: false, error: error instanceof Error ? error.name : 'unknown' }
  }
}

const responsesText = await post('/responses', { model, input: 'Reply with the single word OK.', max_output_tokens: 16 })
result.tests.responsesText = summary(responsesText)
let protocol = responsesText.ok ? 'responses' : null
if (!protocol) {
  const chatText = await post('/chat/completions', { model, messages: [{ role: 'user', content: 'Reply with the single word OK.' }], max_tokens: 16 })
  result.tests.chatCompletionsText = summary(chatText)
  if (chatText.ok) protocol = 'chat'
}

if (protocol === 'responses') {
  const structured = await post('/responses', { model, input: 'Return JSON with ok=true and label="smoke".', text: { format: { type: 'json_schema', name: 'smoke', strict: true, schema: { type: 'object', properties: { ok: { type: 'boolean' }, label: { type: 'string' } }, required: ['ok', 'label'], additionalProperties: false } } }, max_output_tokens: 32 })
  result.tests.structuredJson = summary(structured, hasStructuredJson(structured.payload))
  const image = await post('/responses', { model, input: [{ role: 'user', content: [{ type: 'input_text', text: 'Describe this image in one short phrase.' }, { type: 'input_image', image_url: onePixelPng() }] }], max_output_tokens: 32 })
  result.tests.imageInput = summary(image, Boolean(extractText(image.payload)))
  const tools = await post('/responses', { model, input: 'Use the local read-only tool to get the profile.', tools: [{ type: 'function', name: 'get_profile', description: 'Read an already-authorized local profile.', parameters: { type: 'object', properties: { mode: { type: 'string', enum: ['real', 'demo'] } }, required: ['mode'], additionalProperties: false } }], tool_choice: 'required', max_output_tokens: 32 })
  result.tests.toolCall = summary(tools, hasToolCall(tools.payload))
} else if (protocol === 'chat') {
  const structured = await post('/chat/completions', { model, messages: [{ role: 'user', content: 'Return JSON with ok=true and label="smoke".' }], response_format: { type: 'json_object' }, max_tokens: 32 })
  result.tests.structuredJson = summary(structured, hasStructuredJson(structured.payload))
  const image = await post('/chat/completions', { model, messages: [{ role: 'user', content: [{ type: 'text', text: 'Describe this image in one short phrase.' }, { type: 'image_url', image_url: { url: onePixelPng() } }] }], max_tokens: 32 })
  result.tests.imageInput = summary(image, Boolean(extractText(image.payload)))
  const tools = await post('/chat/completions', { model, messages: [{ role: 'user', content: 'Use the local read-only tool to get the profile.' }], tools: [{ type: 'function', function: { name: 'get_profile', description: 'Read an already-authorized local profile.', parameters: { type: 'object', properties: { mode: { type: 'string', enum: ['real', 'demo'] } }, required: ['mode'], additionalProperties: false } } }], tool_choice: 'required', max_tokens: 32 })
  result.tests.toolCall = summary(tools, hasToolCall(tools.payload))
}
result.protocol = protocol || 'unavailable'
result.status = Object.values(result.tests).every((test) => test.status === 'passed') ? 'passed' : 'partial_or_failed'
console.log(JSON.stringify(result, null, 2))

function summary(response, semanticPass = response.ok) { return { status: response.ok && semanticPass ? 'passed' : 'failed', httpStatus: response.status, hasJsonPayload: Boolean(response.payload), errorType: response.error || undefined } }
function hasStructuredJson(payload) { const text = extractText(payload); try { const value = JSON.parse(text); return value?.ok === true && value?.label === 'smoke' } catch { return false } }
function hasToolCall(payload) { return Boolean(payload?.output?.some?.((item) => item.type === 'function_call') || payload?.choices?.[0]?.message?.tool_calls?.length) }
function extractText(payload) { if (typeof payload?.output_text === 'string') return payload.output_text; if (typeof payload?.choices?.[0]?.message?.content === 'string') return payload.choices[0].message.content; return (payload?.output || []).flatMap((item) => item.content || []).map((content) => typeof content.text === 'string' ? content.text : content.text?.value || content.json || '').join('') }
function onePixelPng() { return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=' }
