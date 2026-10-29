import Dexie, { type Table } from 'dexie'
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
}

export async function applyApprovedProposal(mode: Mode, proposalId: string, profileId: string) {
  return db.transaction('rw', [db.proposals, db.plans, db.audit], async () => {
    const proposal = await db.proposals.where('[mode+id]').equals([mode, proposalId]).first()
    if (!proposal || proposal.status !== 'awaiting_approval') throw new Error('PROPOSAL_NOT_APPROVABLE')
    const current = await repo.getLatestPlan(mode, profileId)
    if (!current || current.version !== proposal.basePlanVersion) throw new Error('PLAN_VERSION_CONFLICT')
    const next: TrainingPlan = { ...current, id: `${current.id}_v${current.version + 1}`, version: current.version + 1, updatedAt: new Date().toISOString(), sessions: current.sessions.map((session, sessionIndex) => ({ ...session, exercises: session.exercises.map((exercise, exerciseIndex) => ({ ...exercise, sets: sessionIndex === 1 && exerciseIndex === 0 && proposal.changes[0]?.field === 'training.sessions[1].exercises[0].sets' ? Number(proposal.changes[0].after) : exercise.sets })) })) }
    const changed = { ...proposal, status: 'applied' as const, updatedAt: new Date().toISOString() }
    await db.plans.put(next); await db.proposals.put(changed); await db.audit.put({ id: `audit_${crypto.randomUUID()}`, mode, schemaVersion: 1, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), action: 'apply_approved_proposal', entityId: proposal.id, summary: `计划 v${current.version} → v${next.version}` })
    return next
  })
}
