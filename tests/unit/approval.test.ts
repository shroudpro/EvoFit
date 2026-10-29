import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { applyApprovedProposal, db, repo } from '../../src/db/database'
import { buildDemoDataset } from '../../src/db/seed'
import { nowIso } from '../../src/shared/utils'

describe('计划审批状态机', () => {
  beforeEach(async () => { await db.delete(); await db.open() })
  it('rejects stale basePlanVersion without changing plan', async () => { const data = buildDemoDataset(); await repo.putProfile(data.profile); await repo.putPlan(data.plan); const proposal = { id: 'p', mode: 'demo' as const, schemaVersion: 1 as const, createdAt: nowIso(), updatedAt: nowIso(), profileId: data.profile.id, basePlanVersion: 2, status: 'awaiting_approval' as const, windowStart: 'x', windowEnd: 'y', evidenceQuality: 'high' as const, changes: [], rationale: 'x', limitations: [], createdBy: 'agent' as const }; await repo.putProposal(proposal); await expect(applyApprovedProposal('demo', 'p', data.profile.id)).rejects.toThrow('PLAN_VERSION_CONFLICT'); expect((await repo.getLatestPlan('demo', data.profile.id))?.version).toBe(1) })
  it('applies once and duplicate click is rejected', async () => { const data = buildDemoDataset(); await repo.putProfile(data.profile); await repo.putPlan(data.plan); const proposal = { id: 'p', mode: 'demo' as const, schemaVersion: 1 as const, createdAt: nowIso(), updatedAt: nowIso(), profileId: data.profile.id, basePlanVersion: 1, status: 'awaiting_approval' as const, windowStart: 'x', windowEnd: 'y', evidenceQuality: 'high' as const, changes: [], rationale: 'x', limitations: [], createdBy: 'agent' as const }; await repo.putProposal(proposal); expect((await applyApprovedProposal('demo', 'p', data.profile.id)).version).toBe(2); await expect(applyApprovedProposal('demo', 'p', data.profile.id)).rejects.toThrow('PROPOSAL_NOT_APPROVABLE') })
})
