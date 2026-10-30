import { executeAgentTool, listAgentToolDefinitions } from './agentTools'
import { requestProvider } from './providerClient'
import { db, repo } from '../db/database'
import type { ChatAgentResult, AgentToolCall, AgentState } from '../shared/agent'
import type { ChatConversation, ChatMessage } from '../shared/types'
import { createId, todayLocalDate } from '../shared/utils'

interface RunChatInput { mode: 'real' | 'demo'; profileId: string; message: string; conversationId?: string; consentGranted: boolean; signal?: AbortSignal }
const MAX_ROUNDS = 6
const MAX_TOOL_CALLS = 6

function extractText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const value = payload as { output_text?: unknown; output?: Array<{ content?: Array<{ text?: unknown; json?: unknown }> }>; choices?: Array<{ message?: { content?: unknown } }> }
  if (typeof value.output_text === 'string') return value.output_text
  if (typeof value.choices?.[0]?.message?.content === 'string') return value.choices[0].message.content
  return (value.output ?? []).flatMap((item) => item.content ?? []).map((content) => typeof content.text === 'string' ? content.text : typeof content.json === 'string' ? content.json : content.json ? JSON.stringify(content.json) : '').join('')
}
function extractCalls(payload: unknown): AgentToolCall[] {
  if (!payload || typeof payload !== 'object') return []
  const output = Array.isArray((payload as { output?: unknown }).output) ? (payload as { output: unknown[] }).output : []
  return output.filter((item): item is { type: 'function_call'; name: string; arguments?: string; call_id?: string } => typeof item === 'object' && item !== null && (item as { type?: unknown }).type === 'function_call').slice(0, MAX_TOOL_CALLS).map((item) => { let args: Record<string, unknown> = {}; try { args = JSON.parse(item.arguments ?? '{}') as Record<string, unknown> } catch { args = { __invalidArguments: true } } return { id: item.call_id ?? createId('tool_call'), name: item.name, arguments: args, status: 'pending' } })
}
function responseMessage(payload: unknown) { const text = extractText(payload); if (!text) return ''; try { const parsed = JSON.parse(text) as { message?: unknown }; return typeof parsed.message === 'string' ? parsed.message : text } catch { return text } }
function toolSchemas() { return listAgentToolDefinitions().map((tool) => ({ type: 'function', name: tool.name, description: `EvoFit ${tool.permission} tool`, parameters: tool.inputSchema })) }
async function ensureConversation(input: RunChatInput): Promise<ChatConversation> {
  if (input.conversationId) { const existing = await db.conversations.where('[mode+id]').equals([input.mode, input.conversationId]).first(); if (existing && existing.profileId === input.profileId) return existing }
  const timestamp = new Date().toISOString(); const conversation: ChatConversation = { id: input.conversationId ?? createId('conversation'), mode: input.mode, schemaVersion: 1, createdAt: timestamp, updatedAt: timestamp, profileId: input.profileId, title: input.message.trim().slice(0, 40) || '新对话', status: 'active' }; await repo.putConversation(conversation); return conversation
}
async function saveMessage(conversation: ChatConversation, role: ChatMessage['role'], content: string, status: ChatMessage['status'] = 'complete', extra: Partial<ChatMessage> = {}) { const timestamp = new Date().toISOString(); const message: ChatMessage = { id: createId('message'), mode: conversation.mode, schemaVersion: 1, createdAt: timestamp, updatedAt: timestamp, conversationId: conversation.id, role, content, status, ...extra }; await repo.putMessage(message); await repo.putConversation({ ...conversation, updatedAt: timestamp }); return message }
async function saveTrace(mode: RunChatInput['mode'], runId: string, toolName: string, inputSummary: string, outputSummary: string, status: 'success' | 'error', startedAt: number) { const timestamp = new Date().toISOString(); await repo.putTrace({ id: createId('trace'), mode, schemaVersion: 1, createdAt: timestamp, updatedAt: timestamp, runId, toolName, purpose: 'chat', inputSummary, outputSummary, status, durationMs: Date.now() - startedAt }) }

async function localFallback(input: RunChatInput, conversation: ChatConversation): Promise<{ message: string; proposalId?: string }> {
  const text = input.message
  if (/改|调整|徒手|训练/.test(text) && /明天|计划|训练/.test(text)) {
    const result = await executeAgentTool('create_plan_proposal', { mode: input.mode, profileId: input.profileId, rationale: '根据你的请求生成待审批训练调整提案。', changes: [{ field: 'training.sessions[1].exercises[0].sets', after: 2, reason: '先用较低训练量验证执行感受' }], evidenceQuality: 'low' }, { mode: input.mode, profileId: input.profileId, conversationId: conversation.id }) as { proposalId?: string }
    return { message: '我已生成一张待审批训练提案。它不会自动修改计划，请在提案卡片中确认。', proposalId: result.proposalId }
  }
  if (/蛋白质|营养|午饭|餐/.test(text)) { const meals = await executeAgentTool('list_meals', { mode: input.mode, profileId: input.profileId, days: 2 }, { mode: input.mode, profileId: input.profileId, conversationId: conversation.id }) as unknown[]; return { message: `我读取了最近餐食记录（${meals.length} 条）。蛋白质只会统计有本地营养来源的已确认食物，未知项需要你补充。` } }
  if (/体重|趋势|变化/.test(text)) { const metrics = await executeAgentTool('get_body_metrics', { mode: input.mode, profileId: input.profileId, days: 14 }, { mode: input.mode, profileId: input.profileId, conversationId: conversation.id }) as unknown[]; return { message: metrics.length ? `最近 14 天有 ${metrics.length} 条身体指标记录，我可以基于这些记录继续分析。` : '最近 14 天暂无身体指标记录，先补充几次体重或腰围，再判断趋势。' } }
  return { message: '我可以查询餐食、运动、训练计划和身体趋势，也可以先生成待审批的计划提案。请告诉我你想查看哪一项。' }
}

export async function runChatAgent(input: RunChatInput): Promise<ChatAgentResult & { conversationId: string }> {
  const conversation = await ensureConversation(input); await saveMessage(conversation, 'user', input.message)
  const runId = createId('chat_run'); let state: AgentState = 'collecting_context'; const toolCalls: AgentToolCall[] = []
  if (!input.consentGranted) { const message = '发送模型前需要你的明确同意；你仍可以继续使用本地手工记录。'; await saveMessage(conversation, 'assistant', message, 'error'); return { state: 'failed', message, toolCalls, errorCode: 'CONSENT_REQUIRED', conversationId: conversation.id } }
  let messages = await repo.listMessages(input.mode, conversation.id, 12); let providerInput: unknown[] = messages.map((message) => ({ role: message.role, content: message.content }))
  let proposalId: string | undefined
  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    state = round === 0 ? 'calling_tools' : 'validating'
    const response = await requestProvider({ purpose: 'chat', mode: input.mode, input: { mode: input.mode, profileId: input.profileId, localDate: todayLocalDate(), messages: providerInput }, responseSchema: { type: 'object', properties: { message: { type: 'string' }, toolCalls: { type: 'array' }, proposalId: { type: ['string', 'null'] } }, required: ['message', 'toolCalls', 'proposalId'], additionalProperties: false }, tools: toolSchemas(), consentGranted: input.consentGranted, signal: input.signal })
    if (response.status !== 'connected') { const fallback = await localFallback(input, conversation); proposalId = fallback.proposalId; await saveMessage(conversation, 'assistant', fallback.message); await db.runs.put({ id: runId, mode: input.mode, schemaVersion: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), profileId: input.profileId, status: 'completed', purpose: 'chat', summary: fallback.message, toolTraceIds: [], proposalId }); return { state: proposalId ? 'proposal_ready' : 'responding', message: fallback.message, toolCalls, proposalId, conversationId: conversation.id, errorCode: response.errorCode }
    }
    const calls = extractCalls(response.payload)
    if (calls.length === 0) { const message = responseMessage(response.payload) || (await localFallback(input, conversation)).message; await saveMessage(conversation, 'assistant', message); await db.runs.put({ id: runId, mode: input.mode, schemaVersion: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), profileId: input.profileId, status: 'completed', purpose: 'chat', summary: message, toolTraceIds: [], proposalId }); return { state: proposalId ? 'proposal_ready' : 'responding', message, toolCalls, proposalId, conversationId: conversation.id }
    }
    const outputs: unknown[] = []
    for (const call of calls) { const startedAt = Date.now(); try { const result = await executeAgentTool(call.name, { ...call.arguments, mode: input.mode, profileId: input.profileId }, { mode: input.mode, profileId: input.profileId, conversationId: conversation.id }); call.status = 'success'; toolCalls.push(call); if (call.name === 'create_plan_proposal' && typeof (result as { proposalId?: unknown }).proposalId === 'string') proposalId = (result as { proposalId: string }).proposalId; outputs.push({ type: 'function_call_output', call_id: call.id, output: JSON.stringify(result) }); await saveMessage(conversation, 'tool', JSON.stringify(result), 'complete', { toolCallId: call.id, toolName: call.name }); await saveTrace(input.mode, runId, call.name, JSON.stringify(call.arguments).slice(0, 300), 'success', 'success', startedAt) } catch (error) { call.status = 'error'; toolCalls.push(call); const message = error instanceof Error ? error.message : 'TOOL_FAILED'; outputs.push({ type: 'function_call_output', call_id: call.id, output: JSON.stringify({ error: message }) }); await saveTrace(input.mode, runId, call.name, JSON.stringify(call.arguments).slice(0, 300), message, 'error', startedAt) } }
    providerInput = [...providerInput, ...(Array.isArray((response.payload as { output?: unknown[] }).output) ? (response.payload as { output: unknown[] }).output : []), ...outputs]
  }
  const message = '工具调用超过安全轮数，已回到手工路径。'; await saveMessage(conversation, 'assistant', message, 'error'); return { state: 'failed', message, toolCalls, proposalId, errorCode: 'TOOL_LOOP_LIMIT', conversationId: conversation.id }
}
