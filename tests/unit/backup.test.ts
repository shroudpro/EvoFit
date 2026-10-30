import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db, importModeBackup, previewModeBackup, previewModeBackupWithConflicts, repo } from '../../src/db/database'
import { buildDemoDataset } from '../../src/db/seed'

describe('本地备份预览与合并', () => {
  beforeEach(async () => { await db.delete(); await db.open() })

  it('rejects a backup whose mode does not match the target mode', async () => {
    const result = previewModeBackup({ schemaVersion: 1, source: 'evofit-local', createdAt: new Date().toISOString(), mode: 'demo', data: { profile: null, plans: [], meals: [], exercises: [], proposals: [], runs: [], traces: [], audit: [] } }, 'real')
    expect(result.ok).toBe(false)
    expect(result.errors).toContain('BACKUP_MODE_MISMATCH')
  })

  it('merges validated records without touching another mode', async () => {
    const data = buildDemoDataset(); await repo.putProfile({ ...data.profile, id: 'real-profile', mode: 'real' })
    const backup = { schemaVersion: 1 as const, source: 'evofit-local' as const, createdAt: new Date().toISOString(), mode: 'demo' as const, data: { profile: data.profile, plans: [data.plan], meals: data.meals, exercises: data.exercises, proposals: [], runs: [], traces: [], audit: [] } }
    const result = await importModeBackup(backup, 'demo')
    expect(result.imported).toBeGreaterThan(0)
    expect(await repo.getProfile('demo')).toMatchObject({ mode: 'demo' })
    expect(await repo.getProfile('real')).toMatchObject({ id: 'real-profile', mode: 'real' })
  })

  it('reports existing IDs in the import preview', async () => {
    const data = buildDemoDataset(); await repo.putProfile(data.profile)
    const backup = { schemaVersion: 1 as const, source: 'evofit-local' as const, createdAt: new Date().toISOString(), mode: 'demo' as const, data: { profile: data.profile, plans: [], meals: [], exercises: [], proposals: [], runs: [], traces: [], audit: [] } }
    const result = await previewModeBackupWithConflicts(backup, 'demo')
    expect(result.conflicts).toContain('profiles:demo_profile')
  })
})
