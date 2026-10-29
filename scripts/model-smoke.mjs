const key = process.env.MODEL_API_KEY || process.env.OPENAI_API_KEY
const baseUrl = process.env.MODEL_BASE_URL || process.env.OPENAI_BASE_URL || ''
const model = process.env.MODEL_ID || process.env.OPENAI_MODEL || 'gpt-6-luna'
if (!key) {
  console.log(JSON.stringify({ status: 'not_run', reason: 'MODEL_API_KEY/OPENAI_API_KEY missing', model }, null, 2))
  process.exit(0)
}
if (!/^https:\/\/(api\.openai\.com|trusted-provider\.example)\//.test(baseUrl)) {
  console.log(JSON.stringify({ status: 'not_run', reason: 'provider URL is not on the allowlist; no request sent', baseUrl: baseUrl || '(missing)', model }, null, 2))
  process.exit(0)
}
const response = await fetch(`${baseUrl}/responses`, { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, input: 'Reply with the single word OK.' }) })
console.log(JSON.stringify({ status: response.ok ? 'passed' : 'failed', httpStatus: response.status, model }, null, 2))
