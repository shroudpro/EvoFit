import { exerciseParseSchema, mealAnalysisSchema, weeklyReviewSchema, type ExerciseParse } from '../shared/schemas'

export type ModelStatus = 'unconfigured' | 'failed' | 'connected' | 'mock'
export interface ModelResult<T> { status: ModelStatus; value?: T; message: string }
export type ReadOnlyToolName = 'get_profile' | 'list_meals' | 'list_exercises' | 'analyze_trends' | 'calculate_daily_balance'
export type ReadOnlyToolExecutor = (name: ReadOnlyToolName, argumentsValue: Record<string, unknown>) => Promise<unknown>

const endpoint = () => `${(import.meta.env.VITE_API_BASE_URL || '/.netlify/functions').replace(/\/$/, '')}/ai-proxy`
const MODEL_REQUEST_TIMEOUT_MS = 15_000

function previewAuthHeaders(): Record<string, string> {
  if (typeof sessionStorage === 'undefined') return {}
  const token = sessionStorage.getItem('evofit-preview-token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), MODEL_REQUEST_TIMEOUT_MS)
  try { return await fetch(input, { ...init, signal: controller.signal }) } finally { clearTimeout(timeout) }
}

function extractText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const value = payload as { output_text?: unknown; output?: Array<{ content?: Array<{ text?: unknown; json?: unknown }> }>; choices?: Array<{ message?: { content?: unknown } }> }
  if (typeof value.output_text === 'string') return value.output_text
  if (typeof value.choices?.[0]?.message?.content === 'string') return value.choices[0].message.content
  return (value.output ?? []).flatMap((item) => item.content ?? []).map((content) => typeof content.text === 'string' ? content.text : typeof content.json === 'string' ? content.json : content.json ? JSON.stringify(content.json) : '').join('')
}

async function requestModel<T>(purpose: 'analyze_meal' | 'parse_exercise' | 'weekly_review', input: unknown, schema: { parse: (value: unknown) => T }, consentGranted: boolean): Promise<ModelResult<T>> {
  if (!consentGranted) return { status: 'failed', message: '发送模型前需要你的明确同意；数据仍保留在本机。' }
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...previewAuthHeaders() }
    const response = await fetchWithTimeout(endpoint(), { method: 'POST', headers, body: JSON.stringify({ purpose, input, consentGranted }) })
    const payload = await response.json().catch(() => ({})) as { error?: string; message?: string; result?: unknown }
    if (response.status === 503 || payload.error === 'MODEL_NOT_CONFIGURED') return { status: 'unconfigured', message: '真实模型未配置；已回到手工或本地规则路径。' }
    if (!response.ok) return { status: 'failed', message: payload.message || `模型请求失败（${response.status}）。已回到手工或本地规则路径。` }
    const text = extractText(payload.result)
    const parsed = schema.parse(JSON.parse(text))
    return { status: 'connected', value: parsed, message: '真实模型已返回结构化结果，请检查并确认。' }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return { status: 'failed', message: '模型请求超时，已回到手工路径。' }
    return { status: 'failed', message: error instanceof Error ? `模型结果无法验证：${error.message}` : '模型结果无法验证，已回到手工路径。' }
  }
}

async function requestWeeklyModel(input: unknown, consentGranted: boolean) {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...previewAuthHeaders() }
    const response = await fetchWithTimeout(endpoint(), { method: 'POST', headers, body: JSON.stringify({ purpose: 'weekly_review', input, consentGranted }) })
    const payload = await response.json().catch(() => ({})) as { error?: string; message?: string; result?: unknown }
    if (response.status === 503 || payload.error === 'MODEL_NOT_CONFIGURED') return { status: 'unconfigured' as const, message: '真实模型未配置；已回到本地规则路径。' }
    if (!response.ok) return { status: 'failed' as const, message: payload.message || `模型请求失败（${response.status}）。已回到本地规则路径。` }
    return { status: 'connected' as const, payload: payload.result as Record<string, unknown>, message: '真实模型已返回结果。' }
  } catch (error) {
    return { status: 'failed' as const, message: error instanceof DOMException && error.name === 'AbortError' ? '模型请求超时，已回到本地规则路径。' : '模型请求失败，已回到本地规则路径。' }
  }
}

function extractToolCalls(payload: Record<string, unknown>) {
  const output = Array.isArray(payload.output) ? payload.output : []
  return output.filter((item): item is { type: 'function_call'; name: string; arguments?: string; call_id?: string } => typeof item === 'object' && item !== null && (item as { type?: unknown }).type === 'function_call').map((item) => {
    let argumentsValue: Record<string, unknown> = {}
    try { argumentsValue = JSON.parse(item.arguments ?? '{}') as Record<string, unknown> } catch { argumentsValue = { __invalidArguments: true } }
    return { name: item.name as ReadOnlyToolName, callId: item.call_id ?? `${item.name}-${crypto.randomUUID()}`, argumentsValue }
  })
}

const mockExercise = (text: string): ExerciseParse => {
  const duration = Number(text.match(/(\d+)\s*分钟/)?.[1] ?? 0)
  const speed = Number(text.match(/([\d.]+)\s*km\/h/i)?.[1] ?? 0)
  const incline = Number(text.match(/([\d.]+)\s*%/)?.[1] ?? 0)
  return exerciseParseSchema.parse({ activityCode: text.includes('跑步') && !text.includes('跑步机') ? 'running' : 'treadmill_walk', activityName: text.includes('跑步机') ? '跑步机快走' : '跑步', durationMin: duration || null, speedKmh: speed || null, inclinePercent: incline || null, intensity: null, missing: duration ? [] : ['时长'] })
}

export async function parseExercise(text: string, useMock = false, consentGranted = false): Promise<ModelResult<ExerciseParse>> {
  if (useMock) return { status: 'mock', value: mockExercise(text), message: '使用明确标记的测试模拟，未调用真实模型。' }
  return requestModel('parse_exercise', [{ role: 'user', content: [{ type: 'input_text', text: `从以下自然语言中提取运动参数。不能猜测缺失字段，只能把缺失字段放入 missing。\n${text}` }] }], exerciseParseSchema, consentGranted)
}

export async function analyzeImage(file: File, useMock = false, consentGranted = false): Promise<ModelResult<{ items: { foodName: string; massGrams: number; confidenceNote: string }[] }>> {
  if (useMock) return { status: 'mock', value: { items: [{ foodName: '待确认餐食', massGrams: 100, confidenceNote: '测试模拟候选，请用户修改名称和重量。' }] }, message: '使用明确标记的测试模拟，未调用真实模型。' }
  if (!file.type.startsWith('image/')) return { status: 'failed', message: '请选择图片文件。' }
  if (file.size > 4 * 1024 * 1024) return { status: 'failed', message: '图片不能超过 4 MB。' }
  const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('IMAGE_READ_FAILED')); reader.onerror = () => reject(new Error('IMAGE_READ_FAILED')); reader.readAsDataURL(file) })
  return requestModel('analyze_meal', [{ role: 'user', content: [{ type: 'input_text', text: '识别图片中的主要食物并估计每项克重。只输出候选，不提供营养数值；不确定时写入 confidenceNote。' }, { type: 'input_image', image_url: dataUrl }] }], mealAnalysisSchema, consentGranted)
}

export async function generateWeeklyReview(summary: unknown, consentGranted: boolean, executeTool?: ReadOnlyToolExecutor) {
  if (!consentGranted) return { status: 'failed' as const, message: '发送模型前需要你的明确同意；数据仍保留在本机。' }
  let conversationInput: unknown[] = [{ role: 'user', content: [{ type: 'input_text', text: `先按需调用只读工具核对历史，再基于工具结果生成保守的计划调整提案。不得修改计划，只返回结构化结果。\n本地摘要：${JSON.stringify(summary)}` }] }]
  let response = await requestWeeklyModel(conversationInput, consentGranted)
  for (let round = 0; round < 3 && response.status === 'connected' && response.payload; round += 1) {
    const calls = extractToolCalls(response.payload)
    if (calls.length === 0) {
      try { return { status: 'connected' as const, value: weeklyReviewSchema.parse(JSON.parse(extractText(response.payload))), message: '真实模型已调用只读工具并返回结构化周报。' } } catch (error) { return { status: 'failed' as const, message: error instanceof Error ? `周报结果无法验证：${error.message}` : '周报结果无法验证。' } }
    }
    if (!executeTool) return { status: 'failed' as const, message: '模型请求了只读工具，但当前没有可用的本地执行器。' }
    const outputs = []
    for (const call of calls) {
      try { outputs.push({ type: 'function_call_output', call_id: call.callId, output: JSON.stringify(await executeTool(call.name, call.argumentsValue)) }) } catch (error) { outputs.push({ type: 'function_call_output', call_id: call.callId, output: JSON.stringify({ error: error instanceof Error ? error.message : 'TOOL_FAILED' }) }) }
    }
    const previousOutput = Array.isArray(response.payload.output) ? response.payload.output : []
    conversationInput = [...conversationInput, ...previousOutput, ...outputs]
    response = await requestWeeklyModel(conversationInput, consentGranted)
  }
  return { status: 'failed' as const, message: '模型工具调用超过安全轮数，已回到本地规则路径。' }
}
