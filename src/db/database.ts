import Dexie, { type Table } from 'dexie'
import { backupSchema } from '../shared/schemas'
import { migrateProfile } from './migrations'
import type { AgentRun, AuditEvent, BodyMetric, ChatConversation, ChatMessage, ExerciseCatalogItem, ExerciseLog, FoodCatalogItem, GoalPlan, Meal, Mode, PlanProposal, SettingRecord, ToolTrace, TrainingPlan, UserProfile } from '../shared/types'

export class EvoFitDatabase extends Dexie {
  profiles!: Table<UserProfile, string>; meals!: Table<Meal, string>; exercises!: Table<ExerciseLog, string>; plans!: Table<TrainingPlan, string>; proposals!: Table<PlanProposal, string>; runs!: Table<AgentRun, string>; traces!: Table<ToolTrace, string>; audit!: Table<AuditEvent, string>
  settings!: Table<SettingRecord, string>; bodyMetrics!: Table<BodyMetric, string>; goals!: Table<GoalPlan, string>; conversations!: Table<ChatConversation, string>; messages!: Table<ChatMessage, string>; foods!: Table<FoodCatalogItem, string>; exerciseCatalog!: Table<ExerciseCatalogItem, string>
  constructor() {
    super('evofit')
    this.version(1).stores({ profiles: '[mode+id], mode, updatedAt', meals: '[mode+id], [mode+localDate], mode, localDate', exercises: '[mode+id], [mode+localDate], mode, localDate', plans: '[mode+id], [mode+profileId], mode, updatedAt', proposals: '[mode+id], [mode+profileId], mode, status', runs: '[mode+id], [mode+profileId], mode, createdAt', audit: '[mode+id], [mode+entityId], mode, createdAt' })
    this.version(2).stores({ profiles: '[mode+id], mode, updatedAt', meals: '[mode+id], [mode+localDate], mode, localDate', exercises: '[mode+id], [mode+localDate], mode, localDate', plans: '[mode+id], [mode+profileId], mode, updatedAt', proposals: '[mode+id], [mode+profileId], mode, status', runs: '[mode+id], [mode+profileId], mode, createdAt', traces: '[mode+id], [mode+runId], mode, createdAt', audit: '[mode+id], [mode+entityId], mode, createdAt' })
    this.version(3).stores({ profiles: '[mode+id], mode, updatedAt', meals: '[mode+id], [mode+localDate], mode, localDate', exercises: '[mode+id], [mode+localDate], mode, localDate', plans: '[mode+id], [mode+profileId], mode, updatedAt', proposals: '[mode+id], [mode+profileId], mode, status', runs: '[mode+id], [mode+profileId], mode, createdAt', traces: '[mode+id], [mode+runId], mode, createdAt', audit: '[mode+id], [mode+entityId], mode, createdAt', settings: '[mode+id], mode', bodyMetrics: '[mode+id], [mode+localDate], mode, localDate', goals: '[mode+id], [mode+profileId], mode, version', conversations: '[mode+id], [mode+profileId], mode, updatedAt', messages: '[mode+id], [mode+conversationId], mode, createdAt', foods: '[mode+id], foodId, name', exerciseCatalog: '[mode+id], exerciseCode, name' }).upgrade(async (tx) => {
      const profiles = tx.table('profiles')
      await profiles.toCollection().modify((profile: UserProfile) => Object.assign(profile, migrateProfile(profile)))
    })
  }
}
export const db = new EvoFitDatabase()

export async function clearMode(mode: Mode) { await db.transaction('rw', [db.profiles, db.meals, db.exercises, db.plans, db.proposals, db.runs, db.traces, db.audit, db.bodyMetrics, db.goals, db.conversations, db.messages], async () => { for (const table of [db.profiles, db.meals, db.exercises, db.plans, db.proposals, db.runs, db.traces, db.audit, db.bodyMetrics, db.goals, db.conversations, db.messages]) await table.where('mode').equals(mode).delete() }) }

export const repo = {
  getProfile: async (mode: Mode) => { const profile = await db.profiles.where('mode').equals(mode).first(); return profile ? migrateProfile(profile) : undefined },
  putProfile: (profile: UserProfile) => db.profiles.put(migrateProfile(profile)),
  getSetting: (mode: Mode) => db.settings.where('[mode+id]').equals([mode, 'active']).first(),
  putSetting: (setting: SettingRecord) => db.settings.put(setting),
  clearProviderKey: async (mode: Mode) => { const setting = await db.settings.where('[mode+id]').equals([mode, 'active']).first(); if (!setting?.provider) return; await db.settings.put({ ...setting, provider: { ...setting.provider, apiKey: '', enabled: false }, updatedAt: new Date().toISOString() }) },
  listMeals: (mode: Mode, localDate?: string) => localDate ? db.meals.where('[mode+localDate]').equals([mode, localDate]).toArray() : db.meals.where('mode').equals(mode).toArray(),
  putMeal: (meal: Meal) => db.meals.put(meal),
  deleteMeal: (mode: Mode, id: string) => db.meals.where('[mode+id]').equals([mode, id]).delete(),
  listExercises: (mode: Mode, localDate?: string) => localDate ? db.exercises.where('[mode+localDate]').equals([mode, localDate]).toArray() : db.exercises.where('mode').equals(mode).toArray(),
  putExercise: (exercise: ExerciseLog) => db.exercises.put(exercise),
  getLatestPlan: (mode: Mode, profileId: string) => db.plans.where('[mode+profileId]').equals([mode, profileId]).reverse().sortBy('version').then((rows) => rows[0]),
  listPlans: (mode: Mode, profileId: string) => db.plans.where('[mode+profileId]').equals([mode, profileId]).sortBy('version'),
  putPlan: (plan: TrainingPlan) => db.plans.put(plan),
  listProposals: (mode: Mode, profileId: string) => db.proposals.where('[mode+profileId]').equals([mode, profileId]).reverse().sortBy('createdAt'),
  putProposal: (proposal: PlanProposal) => db.proposals.put(proposal),
  putRun: (run: AgentRun) => db.runs.put(run),
  getLatestRun: (mode: Mode, profileId: string) => db.runs.where('[mode+profileId]').equals([mode, profileId]).reverse().sortBy('createdAt').then((rows) => rows[0]),
  putTrace: (trace: ToolTrace) => db.traces.put(trace),
  listTraces: (mode: Mode, runId: string) => db.traces.where('[mode+runId]').equals([mode, runId]).sortBy('createdAt'),
  putAudit: (event: AuditEvent) => db.audit.put(event),
  listAudit: (mode: Mode) => db.audit.where('mode').equals(mode).reverse().sortBy('createdAt'),
  listBodyMetrics: (mode: Mode, days?: number) => { const query = db.bodyMetrics.where('mode').equals(mode); return query.toArray().then((rows) => days ? rows.filter((row) => row.localDate >= new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)) : rows) },
  putBodyMetric: (metric: BodyMetric) => db.bodyMetrics.put(metric),
  listGoals: (mode: Mode, profileId: string) => db.goals.where('[mode+profileId]').equals([mode, profileId]).reverse().sortBy('version'),
  putGoal: (goal: GoalPlan) => db.goals.put(goal),
  listConversations: (mode: Mode, profileId: string) => db.conversations.where('[mode+profileId]').equals([mode, profileId]).reverse().sortBy('updatedAt'),
  putConversation: (conversation: ChatConversation) => db.conversations.put(conversation),
  listMessages: (mode: Mode, conversationId: string, limit = 12) => db.messages.where('[mode+conversationId]').equals([mode, conversationId]).reverse().sortBy('createdAt').then((rows) => rows.slice(0, limit).reverse()),
  putMessage: (message: ChatMessage) => db.messages.put(message),
  listFoodCatalog: (mode: Mode, query?: string) => db.foods.where('mode').equals(mode).toArray().then((rows) => query ? rows.filter((row) => row.name.includes(query) || row.foodId.includes(query)) : rows),
  putFood: (food: FoodCatalogItem) => db.foods.put(food),
  listExerciseCatalog: (mode: Mode) => db.exerciseCatalog.where('mode').equals(mode).toArray(),
  putExerciseCatalogItem: (item: ExerciseCatalogItem) => db.exerciseCatalog.put(item),
  updateTrainingExerciseStatus: async (mode: Mode, planId: string, sessionDay: number, exerciseId: string, status: 'planned' | 'completed' | 'skipped' | 'postponed') => db.transaction('rw', db.plans, async () => {
    const plan = await db.plans.where('[mode+id]').equals([mode, planId]).first()
    if (!plan) throw new Error('PLAN_NOT_FOUND')
    const session = plan.sessions.find((item) => item.day === sessionDay)
    const exercise = session?.exercises.find((item) => item.id === exerciseId)
    if (!exercise) throw new Error('TRAINING_EXERCISE_NOT_FOUND')
    const timestamp = new Date().toISOString()
    const sessions = plan.sessions.map((item) => item.day !== sessionDay ? item : { ...item, exercises: item.exercises.map((candidate) => candidate.id !== exerciseId ? candidate : { ...candidate, status, completedAt: status === 'completed' ? timestamp : undefined, skippedAt: status === 'skipped' ? timestamp : undefined }) })
    await db.plans.put({ ...plan, sessions, updatedAt: timestamp })
  }),
  rescheduleTrainingExercise: async (mode: Mode, planId: string, sessionDay: number, exerciseId: string, scheduledDate: string) => db.transaction('rw', [db.plans, db.audit], async () => {
    const plan = await db.plans.where('[mode+id]').equals([mode, planId]).first(); if (!plan) throw new Error('PLAN_NOT_FOUND')
    const session = plan.sessions.find((item) => item.day === sessionDay); const exercise = session?.exercises.find((item) => item.id === exerciseId); if (!exercise) throw new Error('TRAINING_EXERCISE_NOT_FOUND')
    const timestamp = new Date().toISOString(); const sessions = plan.sessions.map((item) => item.day !== sessionDay ? item : { ...item, exercises: item.exercises.map((candidate) => candidate.id !== exerciseId ? candidate : { ...candidate, status: 'postponed' as const, scheduledDate }) })
    await db.plans.put({ ...plan, sessions, updatedAt: timestamp }); await db.audit.put({ id: `audit_${crypto.randomUUID()}`, mode, schemaVersion: 1, createdAt: timestamp, updatedAt: timestamp, action: 'reschedule_training', entityId: exerciseId, summary: `${exercise.name} 改期至 ${scheduledDate}` })
  }),
  updateTrainingFeedback: async (mode: Mode, planId: string, sessionDay: number, exerciseId: string, feedback: string, rpe?: number) => db.transaction('rw', db.plans, async () => {
    const plan = await db.plans.where('[mode+id]').equals([mode, planId]).first(); if (!plan) throw new Error('PLAN_NOT_FOUND'); const timestamp = new Date().toISOString(); const sessions = plan.sessions.map((item) => item.day !== sessionDay ? item : { ...item, exercises: item.exercises.map((candidate) => candidate.id !== exerciseId ? candidate : { ...candidate, feedback: feedback.trim().slice(0, 500), rpe }) }); await db.plans.put({ ...plan, sessions, updatedAt: timestamp })
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
  const rows = [data.profile, ...data.plans, ...data.meals, ...data.exercises, ...data.proposals, ...data.runs, ...data.traces, ...data.audit, ...data.goals, ...data.bodyMetrics, ...data.conversations, ...data.messages].filter((row): row is NonNullable<typeof row> => row !== null)
  return rows.some((row) => row.mode !== targetMode) ? ['BACKUP_RECORD_MODE_MISMATCH'] : []
}

export function previewModeBackup(input: unknown, targetMode: Mode): BackupPreview {
  const parsed = backupRecords(input)
  const errors = modeErrors(parsed, targetMode)
  if (!parsed.success) return { ok: false, mode: targetMode, recordCounts: {}, timeRange: {}, conflicts: [], errors }
  const { data } = parsed.data
  const rows = [data.profile, ...data.plans, ...data.meals, ...data.exercises, ...data.proposals, ...data.runs, ...data.traces, ...data.audit, ...data.goals, ...data.bodyMetrics, ...data.conversations, ...data.messages].filter((row): row is NonNullable<typeof row> => row !== null)
  const timestamps = rows.flatMap((row) => [row.createdAt, row.updatedAt]).sort()
  const recordCounts = { profiles: data.profile ? 1 : 0, plans: data.plans.length, meals: data.meals.length, exercises: data.exercises.length, proposals: data.proposals.length, runs: data.runs.length, traces: data.traces.length, audit: data.audit.length, goals: data.goals.length, bodyMetrics: data.bodyMetrics.length, conversations: data.conversations.length, messages: data.messages.length }
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
  await check('plans', db.plans, data.plans); await check('meals', db.meals, data.meals); await check('exercises', db.exercises, data.exercises); await check('proposals', db.proposals, data.proposals); await check('runs', db.runs, data.runs); await check('traces', db.traces, data.traces); await check('audit', db.audit, data.audit); await check('goals', db.goals, data.goals); await check('bodyMetrics', db.bodyMetrics, data.bodyMetrics); await check('conversations', db.conversations, data.conversations); await check('messages', db.messages, data.messages)
  return { ...preview, conflicts }
}

export async function importModeBackup(input: unknown, targetMode: Mode) {
  const parsed = backupRecords(input)
  const errors = modeErrors(parsed, targetMode)
  if (!parsed.success || errors.length) throw new Error(errors[0] ?? 'BACKUP_INVALID')
  const { data } = parsed.data
  let imported = 0; let conflicts = 0
  await db.transaction('rw', [db.profiles, db.plans, db.meals, db.exercises, db.proposals, db.runs, db.traces, db.audit, db.goals, db.bodyMetrics, db.conversations, db.messages], async () => {
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
    for (const row of data.goals) await putIfMissing(db.goals, row)
    for (const row of data.bodyMetrics) await putIfMissing(db.bodyMetrics, row)
    for (const row of data.conversations) await putIfMissing(db.conversations, row)
    for (const row of data.messages) await putIfMissing(db.messages, row)
  })
  return { imported, conflicts }
}

export async function exportModeBackup(mode: Mode) {
  const setting = await repo.getSetting(mode)
  const backup = { schemaVersion: 1 as const, source: 'evofit-local' as const, createdAt: new Date().toISOString(), mode, provider: setting?.provider ? { transport: setting.provider.transport, protocol: setting.provider.protocol, baseUrl: setting.provider.baseUrl, model: setting.provider.model, hasApiKey: Boolean(setting.provider.apiKey), updatedAt: setting.provider.updatedAt } : undefined, data: { profile: (await repo.getProfile(mode)) ?? null, plans: await db.plans.where('mode').equals(mode).toArray(), meals: await db.meals.where('mode').equals(mode).toArray(), exercises: await db.exercises.where('mode').equals(mode).toArray(), proposals: await db.proposals.where('mode').equals(mode).toArray(), runs: await db.runs.where('mode').equals(mode).toArray(), traces: await db.traces.where('mode').equals(mode).toArray(), audit: await db.audit.where('mode').equals(mode).toArray(), goals: await db.goals.where('mode').equals(mode).toArray(), bodyMetrics: await db.bodyMetrics.where('mode').equals(mode).toArray(), conversations: await db.conversations.where('mode').equals(mode).toArray(), messages: await db.messages.where('mode').equals(mode).toArray() } }
  return backupSchema.parse(backup)
}
