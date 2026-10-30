import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, repo } from '../../src/db/database'
import { executeAgentTool, listAgentToolDefinitions } from '../../src/api/agentTools'
import { buildDemoDataset } from '../../src/db/seed'

describe('Agent 工具注册表', () => {
  beforeEach(async () => { await db.delete(); await db.open() })
  it('registers all P0 tools and enforces mode scope', async () => { const names = listAgentToolDefinitions().map((tool) => tool.name); expect(names).toEqual(expect.arrayContaining(['get_profile', 'list_meals', 'get_training_plan', 'lookup_food_nutrients', 'lookup_activity_met', 'calculate_daily_balance', 'analyze_trends', 'get_body_metrics', 'create_plan_proposal'])); const data = buildDemoDataset(); await repo.putProfile(data.profile); await expect(executeAgentTool('get_profile', { mode: 'real' }, { mode: 'demo', profileId: data.profile.id })).rejects.toThrow('MODE_SCOPE_MISMATCH') })
  it('keeps proposal creation pending approval and does not modify plan', async () => { const data = buildDemoDataset(); await repo.putProfile(data.profile); await repo.putPlan(data.plan); const result = await executeAgentTool('create_plan_proposal', { mode: 'demo', profileId: data.profile.id, rationale: '补充证据后再小幅调整', changes: [{ field: 'training.sessions[1].exercises[0].sets', after: 2, reason: '测试' }] }, { mode: 'demo', profileId: data.profile.id }); expect(result).toMatchObject({ status: 'awaiting_approval' }); expect((await repo.getLatestPlan('demo', data.profile.id))?.version).toBe(1) })
  it('rejects unknown tools and invalid input', async () => { await expect(executeAgentTool('no_such_tool', {}, { mode: 'demo', profileId: 'p' })).rejects.toThrow('UNKNOWN_TOOL'); await expect(executeAgentTool('list_meals', { mode: 'demo', days: 99 }, { mode: 'demo', profileId: 'p' })).rejects.toThrow('INVALID_TOOL_ARGUMENTS') })
})
