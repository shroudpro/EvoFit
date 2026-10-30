import { executeAgentTool, listAgentToolDefinitions } from './agentTools'
import { buildChatContext, COACH_SYSTEM_PROMPT, formatLocalReadOnlyAnswer, isLocalReadOnlyQuery, type ChatContext } from './chatContext'
import { requestProvider } from './providerClient'
import { db, repo } from '../db/database'
import type { ChatAgentResult, AgentToolCall, AgentState } from '../shared/agent'
import type { ChatConversation, ChatMessage } from '../shared/types'
import { createId } from '../shared/utils'

interface RunChatInput { mode: 'real' | 'demo'; profileId: string; message: string; conversationId?: string; consentGranted: boolean; signal?: AbortSignal }
const MAX_ROUNDS = 6
const MAX_TOOL_CALLS = 6
const CHAT_RESPONSE_SCHEMA = { type: 'object', properties: { message: { type: 'string' } }, required: ['message'], additionalProperties: false }

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
async function saveRun(input: RunChatInput, runId: string, summary: string, status: 'completed' | 'failed', proposalId?: string) { const timestamp = new Date().toISOString(); await db.runs.put({ id: runId, mode: input.mode, schemaVersion: 1, createdAt: timestamp, updatedAt: timestamp, profileId: input.profileId, status, purpose: 'chat', summary, toolTraceIds: [], proposalId }) }

async function localReadOnlyAnswer(input: RunChatInput, conversation: ChatConversation, context?: ChatContext) {
  const resolvedContext = context ?? await buildChatContext(input.mode, input.profileId)
  const message = formatLocalReadOnlyAnswer(input.message, resolvedContext)
  return { message: message || '当前画像中没有足够的数据回答这个只读问题。' }
}

function createProviderInput(context: ChatContext, messages: ChatMessage[]) {
  const { systemPrompt: _systemPrompt, ...userContext } = context
  return [
    { role: 'system', content: [{ type: 'input_text', text: COACH_SYSTEM_PROMPT }] },
    { role: 'user', content: [{ type: 'input_text', text: JSON.stringify({ userContext, conversation: messages.map((message) => ({ role: message.role, content: message.content })) }) }] },
  ]
}

export async function runChatAgent(input: RunChatInput): Promise<ChatAgentResult & { conversationId: string }> {
  const conversation = await ensureConversation(input); await saveMessage(conversation, 'user', input.message)
  const runId = createId('chat_run')
  const context = await buildChatContext(input.mode, input.profileId)

  if (isLocalReadOnlyQuery(input.message) && !input.consentGranted) { const local = await localReadOnlyAnswer(input, conversation, context); await saveMessage(conversation, 'assistant', local.message); await saveRun(input, runId, local.message, 'completed'); return { state: 'responding', message: local.message, toolCalls: [], conversationId: conversation.id } }
  if (!input.consentGranted) { const message = '发送普通模型聊天前需要你的明确同意；BMI 和画像基础信息等本地只读问题可以直接查询。'; await saveMessage(conversation, 'assistant', message, 'error'); await saveRun(input, runId, message, 'failed'); return { state: 'failed', message, toolCalls: [], errorCode: 'CONSENT_REQUIRED', conversationId: conversation.id } }

  const messages = await repo.listMessages(input.mode, conversation.id, 12)
  let providerInput: unknown[] = createProviderInput(context, messages)
  let proposalId: string | undefined
  const toolCalls: AgentToolCall[] = []
  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    const response = await requestProvider({ purpose: 'chat', mode: input.mode, input: providerInput, responseSchema: CHAT_RESPONSE_SCHEMA, tools: toolSchemas(), consentGranted: true, signal: input.signal })
    if (response.status !== 'connected') {
      if (isLocalReadOnlyQuery(input.message)) { const local = await localReadOnlyAnswer(input, conversation, context); await saveMessage(conversation, 'assistant', local.message); await saveRun(input, runId, local.message, 'completed'); return { state: 'responding', message: local.message, toolCalls, conversationId: conversation.id, errorCode: response.errorCode } }
      const message = response.message || '模型暂不可用，请稍后重试或继续使用本地记录。'; await saveMessage(conversation, 'assistant', message, 'error'); await saveRun(input, runId, message, 'failed'); return { state: 'failed', message, toolCalls, errorCode: response.errorCode, conversationId: conversation.id }
    }
    const calls = extractCalls(response.payload)
    if (calls.length === 0) { const message = responseMessage(response.payload); if (!message) { const empty = '模型没有返回可显示的回答，请稍后重试。'; await saveMessage(conversation, 'assistant', empty, 'error'); await saveRun(input, runId, empty, 'failed'); return { state: 'failed', message: empty, toolCalls, errorCode: 'MODEL_EMPTY_RESPONSE', conversationId: conversation.id } } await saveMessage(conversation, 'assistant', message); await saveRun(input, runId, message, 'completed', proposalId); return { state: proposalId ? 'proposal_ready' : 'responding', message, toolCalls, proposalId, conversationId: conversation.id } }
    const outputs: unknown[] = []
    for (const call of calls) { const startedAt = Date.now(); try { const result = await executeAgentTool(call.name, { ...call.arguments, mode: input.mode, profileId: input.profileId }, { mode: input.mode, profileId: input.profileId, conversationId: conversation.id }); call.status = 'success'; toolCalls.push(call); if (call.name === 'create_plan_proposal' && typeof (result as { proposalId?: unknown }).proposalId === 'string') proposalId = (result as { proposalId: string }).proposalId; outputs.push({ type: 'function_call_output', call_id: call.id, output: JSON.stringify(result) }); await saveMessage(conversation, 'tool', JSON.stringify(result), 'complete', { toolCallId: call.id, toolName: call.name }); await saveTrace(input.mode, runId, call.name, JSON.stringify(call.arguments).slice(0, 300), 'success', 'success', startedAt) } catch (error) { call.status = 'error'; toolCalls.push(call); const message = error instanceof Error ? error.message : 'TOOL_FAILED'; outputs.push({ type: 'function_call_output', call_id: call.id, output: JSON.stringify({ error: message }) }); await saveTrace(input.mode, runId, call.name, JSON.stringify(call.arguments).slice(0, 300), message, 'error', startedAt) } }
    providerInput = [...providerInput, ...(Array.isArray((response.payload as { output?: unknown[] }).output) ? (response.payload as { output: unknown[] }).output : []), ...outputs]
  }
  const message = '工具调用超过安全轮数，已停止本次请求；有效计划没有改变。'; await saveMessage(conversation, 'assistant', message, 'error'); await saveRun(input, runId, message, 'failed', proposalId); return { state: 'failed', message, toolCalls, proposalId, errorCode: 'TOOL_LOOP_LIMIT', conversationId: conversation.id }
}
