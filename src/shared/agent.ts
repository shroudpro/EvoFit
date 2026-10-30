import type { Mode } from './types'

export type AgentToolPermission = 'read' | 'proposal'
export type AgentState = 'idle' | 'collecting_context' | 'calling_tools' | 'validating' | 'responding' | 'proposal_ready' | 'awaiting_user_approval' | 'needs_more_data' | 'failed'
export interface AgentToolContext { mode: Mode; profileId: string; conversationId?: string }
export interface AgentToolCall { id: string; name: string; arguments: Record<string, unknown>; status: 'pending' | 'success' | 'error' }
export interface AgentToolDefinition { name: string; permission: AgentToolPermission; inputSchema: object; execute: (input: unknown, context: AgentToolContext) => Promise<unknown> }
export interface ChatAgentResult { state: AgentState; message: string; toolCalls: AgentToolCall[]; proposalId?: string; errorCode?: string }
