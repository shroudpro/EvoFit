import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, repo } from '../../src/db/database'
import { runWeeklyReview } from '../../src/api/agent'
import { buildDemoDataset } from '../../src/db/seed'

describe('本地 Agent 只读工具', () => { beforeEach(async () => { await db.delete(); await db.open() }); it('creates trace and pending proposal from real local statistics', async () => { const data = buildDemoDataset(); await repo.putProfile(data.profile); await repo.putPlan(data.plan); for (const meal of data.meals) await repo.putMeal(meal); for (const exercise of data.exercises) await repo.putExercise(exercise); const result = await runWeeklyReview('demo', data.profile.id); expect(result.traces.length).toBeGreaterThanOrEqual(5); expect((await repo.listTraces('demo', result.run.id)).length).toBe(result.traces.length); expect(result.proposal.mode).toBe('demo'); expect(result.proposal.status).toMatch(/awaiting_approval|needs_more_data/) }) })
