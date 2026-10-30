import Dexie, { type Table } from 'dexie'
import { backupSchema } from '../shared/schemas'
import type { AgentRun, AuditEvent, ExerciseLog, Meal, Mode, PlanProposal, ToolTrace, TrainingPlan, UserProfile } from '../shared/types'

export class EvoFitDatabase extends Dexie {
  profiles!: Table<UserProfile, string>; meals!: Table<Meal, string>; exercises!: Table<ExerciseLog, string>; plans!: Table<TrainingPlan, string>; proposals!: Table<PlanProposal, string>; runs!: Table<AgentRun, string>; traces!: Table<ToolTrace, string>; audit!: Table<AuditEvent, string>
  constructor() { super('evofit'); this.version(1).stores({ profiles: '[mode+id], mode, updatedAt', meals: '[mode+id], [mode+localDate], mode, localDate', exercises: '[mode+id], [mode+localDate], mode, localDate', plans: '[mode+id], [mode+profileId], mode, updatedAt', proposals: '[mode+id], [mode+profileId], mode, status', runs: '[mode+id], [mode+profileId], mode, createdAt', audit: '[mode+id], [mode+entityId], mode, createdAt' }); this.version(2).stores({ profiles: '[mode+id], mode, updatedAt', meals: '[mode+id], [mode+localDate], mode, localDate', exercises: '[mode+id], [mode+localDate], mode, localDate', plans: '[mode+id], [mode+profileId], mode, updatedAt', proposals: '[mode+id], [mode+profileId], mode, status', runs: '[mode+id], [mode+profileId], mode, createdAt', traces: '[mode+id], [mode+runId], mode, createdAt', audit: '[mode+id], [mode+entityId], mode, createdAt' }) }
}
export const db = new EvoFitDatabase()

export async function clearMode(mode: Mode) { await db.transaction('rw', [db.profiles, db.meals, db.exercises, db.plans, db.proposals, db.runs, db.traces, db.audit], async () => { for (const table of [db.profiles, db.meals, db.exercises, db.plans, db.proposals, db.runs, db.traces, db.audit]) await table.where('mode').equals(mode).delete() }) }

export const repo = {
  getProfile: (mode: Mode) => db.profiles.where('mode').equals(mode).first(),
  putProfile: (profile: UserProfile) => db.profiles.put(profile),
  listMeals: (mode: Mode, localDate?: string) => localDate ? db.meals.where('[mode+localDate]').equals([mode, localDate]).toArray() : db.meals.where('mode').equals(mode).toArray(),
  putMeal: (meal: Meal) => db.meals.put(meal),
  deleteMeal: (mode: Mode, id: string) => db.meals.where('[mode+id]').equals([mode, id]).delete(),
  listExercises: (mode: Mode, localDate?: string) => localDate ? db.exercises.where('[mode+localDate]').equals([mode, localDate]).toArray() : db.exercises.where('mode').equals(mode).toArray(),
  putExercise: (exercise: ExerciseLog) => db.exercises.put(exercise),
  getLatestPlan: (mode: Mode, profileId: string) => db.plans.where('[mode+profileId]').equals([mode, profileId]).reverse().sortBy('version').then((rows) => rows[0]),
  putPlan: (plan: TrainingPlan) => db.plans.put(plan),
  listProposals: (mode: Mode, profileId: string) => db.proposals.where('[mode+profileId]').equals([mode, profileId]).reverse().sortBy('createdAt'),
  putProposal: (proposal: PlanProposal) => db.proposals.put(proposal),
  putRun: (run: AgentRun) => db.runs.put(run),
  getLatestRun: (mode: Mode, profileId: string) => db.runs.where('[mode+profileId]').equals([mode, profileId]).reverse().sortBy('createdAt').then((rows) => rows[0]),
  putTrace: (trace: ToolTrace) => db.traces.put(trace),
  listTraces: (mode: Mode, runId: string) => db.traces.where('[mode+runId]').equals([mode, runId]).sortBy('createdAt'),
  putAudit: (event: AuditEvent) => db.audit.put(event),
  listAudit: (mode: Mode) => db.audit.where('mode').equals(mode).reverse().sortBy('createdAt'),
  updateTrainingExerciseStatus: async (mode: Mode, planId: string, sessionDay: number, exerciseId: string, status: 'planned' | 'completed' | 'skipped') => db.transaction('rw', db.plans, async () => {
    const plan = await db.plans.where('[mode+id]').equals([mode, planId]).first()
    if (!plan) throw new Error('PLAN_NOT_FOUND')
    const session = plan.sessions.find((item) => item.day === sessionDay)
    const exercise = session?.exercises.find((item) => item.id === exerciseId)
    if (!exercise) throw new Error('TRAINING_EXERCISE_NOT_FOUND')
    const timestamp = new Date().toISOString()
    const sessions = plan.sessions.map((item) => item.day !== sessionDay ? item : { ...item, exercises: item.exercises.map((candidate) => candidate.id !== exerciseId ? candidate : { ...candidate, status, completedAt: status === 'completed' ? timestamp : undefined, skippedAt: status === 'skipped' ? timestamp : undefined }) })
    await db.plans.put({ ...plan, sessions, updatedAt: timestamp })
  }),
}

export async function applyApprovedProposal(mode: Mode, proposalId: string, profileId: string) {
  return db.transaction('rw', [db.proposals, db.plans, db.audit], async () => {
    const proposal = await db.proposals.where('[mode+id]').equals([mode, proposalId]).first()
    if (!proposal || proposal.status !== 'awaiting_approval') throw new Error('PROPOSAL_NOT_APPROVABLE')
    if (proposal.profileId !== profileId) throw new Error('PROFILE_SCOPE_MISMATCH')
    const current = await repo.getLatestPlan(mode, profileId)
    if (!current || current.version !== proposal.basePlanVersion) throw new Error('PLAN_VERSION_CONFLICT')
    const next: TrainingPlan = { ...current, id: `${current.id}_v${current.version + 1}`, version: current.version + 1, updatedAt: new Date().toISOString(), sessions: current.sessions.map((session, sessionIndex) => ({ ...session, exercises: session.exercises.map((exercise, exerciseIndex) => ({ ...exercise, sets: sessionIndex === 1 && exerciseIndex === 0 && proposal.changes[0]?.field === 'training.sessions[1].exercises[0].sets' ? Number(proposal.changes[0].after) : exercise.sets })) })) }
    const changed = { ...proposal, status: 'applied' as const, updatedAt: new Date().toISOString() }
    await db.plans.put(next); await db.proposals.put(changed); await db.audit.put({ id: `audit_${crypto.randomUUID()}`, mode, schemaVersion: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), action: 'apply_approved_proposal', entityId: proposal.id, summary: `计划 v${current.version} → v${next.version}` })
    return next
  })
}

export interface BackupPreview { ok: boolean; mode: Mode; recordCounts: Record<string, number>; timeRange: { start?: string; end?: string }; conflicts: string[]; errors: string[] }

function backupRecords(input: unknown) { return backupSchema.safeParse(input) }

function modeErrors(backup: ReturnType<typeof backupRecords>, targetMode: Mode) {
  if (!backup.success) return ['BACKUP_SCHEMA_INVALID']
  const { mode, data } = backup.data
  if (mode !== targetMode) return ['BACKUP_MODE_MISMATCH']
  const rows = [data.profile, ...data.plans, ...data.meals, ...data.exercises, ...data.proposals, ...data.runs, ...data.traces, ...data.audit].filter((row): row is NonNullable<typeof row> => row !== null)
  return rows.some((row) => row.mode !== targetMode) ? ['BACKUP_RECORD_MODE_MISMATCH'] : []
}

export function previewModeBackup(input: unknown, targetMode: Mode): BackupPreview {
  const parsed = backupRecords(input)
  const errors = modeErrors(parsed, targetMode)
  if (!parsed.success) return { ok: false, mode: targetMode, recordCounts: {}, timeRange: {}, conflicts: [], errors }
  const { data } = parsed.data
  const rows = [data.profile, ...data.plans, ...data.meals, ...data.exercises, ...data.proposals, ...data.runs, ...data.traces, ...data.audit].filter((row): row is NonNullable<typeof row> => row !== null)
  const timestamps = rows.flatMap((row) => [row.createdAt, row.updatedAt]).sort()
  const recordCounts = { profiles: data.profile ? 1 : 0, plans: data.plans.length, meals: data.meals.length, exercises: data.exercises.length, proposals: data.proposals.length, runs: data.runs.length, traces: data.traces.length, audit: data.audit.length }
  return { ok: errors.length === 0, mode: targetMode, recordCounts, timeRange: { start: timestamps[0], end: timestamps[timestamps.length - 1] }, conflicts: [], errors }
}

export async function previewModeBackupWithConflicts(input: unknown, targetMode: Mode): Promise<BackupPreview> {
  const preview = previewModeBackup(input, targetMode)
  if (!preview.ok) return preview
  const parsed = backupRecords(input)
  if (!parsed.success) return preview
  const { data } = parsed.data
  const conflicts: string[] = []
  const check = async (name: string, table: Table<{ id: string; mode: Mode }, string>, rows: Array<{ id: string }>) => { for (const row of rows) if (await table.where('[mode+id]').equals([targetMode, row.id]).first()) conflicts.push(`${name}:${row.id}`) }
  if (data.profile) await check('profiles', db.profiles, [data.profile])
  await check('plans', db.plans, data.plans); await check('meals', db.meals, data.meals); await check('exercises', db.exercises, data.exercises); await check('proposals', db.proposals, data.proposals); await check('runs', db.runs, data.runs); await check('traces', db.traces, data.traces); await check('audit', db.audit, data.audit)
  return { ...preview, conflicts }
}

export async function importModeBackup(input: unknown, targetMode: Mode) {
  const parsed = backupRecords(input)
  const errors = modeErrors(parsed, targetMode)
  if (!parsed.success || errors.length) throw new Error(errors[0] ?? 'BACKUP_INVALID')
  const { data } = parsed.data
  let imported = 0; let conflicts = 0
  await db.transaction('rw', [db.profiles, db.plans, db.meals, db.exercises, db.proposals, db.runs, db.traces, db.audit], async () => {
    const putIfMissing = async <T extends { id: string; mode: Mode }>(table: Table<T, string>, row: T) => {
      const existing = await table.where('[mode+id]').equals([targetMode, row.id]).first()
      if (existing) { conflicts += 1; return }
      await table.put(row); imported += 1
    }
    if (data.profile) await putIfMissing(db.profiles, data.profile)
    for (const row of data.plans) await putIfMissing(db.plans, row)
    for (const row of data.meals) await putIfMissing(db.meals, row)
    for (const row of data.exercises) await putIfMissing(db.exercises, row)
    for (const row of data.proposals) await putIfMissing(db.proposals, row)
    for (const row of data.runs) await putIfMissing(db.runs, row)
    for (const row of data.traces) await putIfMissing(db.traces, row)
    for (const row of data.audit) await putIfMissing(db.audit, row)
  })
  return { imported, conflicts }
}

export async function exportModeBackup(mode: Mode) {
  const backup = { schemaVersion: 1 as const, source: 'evofit-local' as const, createdAt: new Date().toISOString(), mode, data: { profile: (await repo.getProfile(mode)) ?? null, plans: await db.plans.where('mode').equals(mode).toArray(), meals: await db.meals.where('mode').equals(mode).toArray(), exercises: await db.exercises.where('mode').equals(mode).toArray(), proposals: await db.proposals.where('mode').equals(mode).toArray(), runs: await db.runs.where('mode').equals(mode).toArray(), traces: await db.traces.where('mode').equals(mode).toArray(), audit: await db.audit.where('mode').equals(mode).toArray() } }
  return backupSchema.parse(backup)
}
