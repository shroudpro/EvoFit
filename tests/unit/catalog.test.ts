import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { curatedExerciseCatalog, curatedFoodCatalog } from '../../src/db/catalog'
import { db, repo } from '../../src/db/database'
import { buildDemoDataset } from '../../src/db/seed'

describe('curated catalogs and training scheduling', () => {
  beforeEach(async () => { await db.delete(); await db.open() })
  it('contains the required manually reviewed catalog sizes', () => { expect(curatedFoodCatalog.length).toBeGreaterThanOrEqual(30); expect(curatedExerciseCatalog.length).toBeGreaterThanOrEqual(20) })
  it('reschedules a task without deleting the plan record', async () => { const data = buildDemoDataset(); await repo.putPlan(data.plan); const exercise = data.plan.sessions[0].exercises[0]; await repo.rescheduleTrainingExercise('demo', data.plan.id, 0, exercise.id, '2026-11-02'); const plan = await repo.getLatestPlan('demo', data.profile.id); expect(plan?.sessions[0].exercises[0]).toMatchObject({ status: 'postponed', scheduledDate: '2026-11-02' }); expect(await repo.listAudit('demo')).toEqual(expect.arrayContaining([expect.objectContaining({ action: 'reschedule_training' })])) })
})
