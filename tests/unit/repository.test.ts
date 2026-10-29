import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { clearMode, db, repo } from '../../src/db/database'
import { buildDemoDataset, resetDemoData } from '../../src/db/seed'

describe('mode 隔离与持久化', () => {
  beforeEach(async () => { await db.delete(); await db.open() })
  it('does not allow demo reset to remove real rows', async () => { const real = buildDemoDataset().profile; await repo.putProfile({ ...real, id: 'real_profile', mode: 'real' }); await resetDemoData(); expect(await repo.getProfile('real')).toMatchObject({ id: 'real_profile', mode: 'real' }); expect(await repo.getProfile('demo')).toMatchObject({ mode: 'demo' }) })
  it('queries meals with explicit mode and date', async () => { const meal = buildDemoDataset().meals[0]; await repo.putMeal(meal); expect((await repo.listMeals('demo', meal.localDate)).length).toBe(1); expect((await repo.listMeals('real', meal.localDate)).length).toBe(0) })
  it('clears one mode only', async () => { const data = buildDemoDataset(); await repo.putProfile(data.profile); await repo.putProfile({ ...data.profile, id: 'real', mode: 'real' }); await clearMode('demo'); expect(await repo.getProfile('demo')).toBeUndefined(); expect(await repo.getProfile('real')).toBeDefined() })
})
