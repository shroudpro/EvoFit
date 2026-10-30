import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db, repo } from '../../src/db/database'
import { buildDemoDataset } from '../../src/db/seed'
import { runChatAgent } from '../../src/api/chatAgent'

describe('chat agent', () => {
  beforeEach(async () => { await db.delete(); await db.open(); vi.restoreAllMocks() })
  it('persists a consent error without calling provider', async () => { const data = buildDemoDataset(); await repo.putProfile(data.profile); const fetchSpy = vi.spyOn(globalThis, 'fetch'); const result = await runChatAgent({ mode: 'demo', profileId: data.profile.id, message: '查昨天蛋白质', consentGranted: false }); expect(result.errorCode).toBe('CONSENT_REQUIRED'); expect(fetchSpy).not.toHaveBeenCalled(); expect((await repo.listMessages('demo', result.conversationId)).length).toBe(2) })
  it('falls back locally and creates only a pending proposal for plan changes', async () => { const data = buildDemoDataset(); await repo.putProfile(data.profile); await repo.putPlan(data.plan); vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'MODEL_NOT_CONFIGURED' }), { status: 503 })); const result = await runChatAgent({ mode: 'demo', profileId: data.profile.id, message: '把明天训练改成宿舍徒手', consentGranted: true }); expect(result.state).toBe('proposal_ready'); expect(result.proposalId).toBeTruthy(); expect((await repo.getLatestPlan('demo', data.profile.id))?.version).toBe(1); expect((await repo.listProposals('demo', data.profile.id))[0]?.status).toBe('awaiting_approval') })
})
