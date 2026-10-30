import { estimateRee } from './calculation'
import type { GoalPlan, UserProfile } from '../shared/types'

const ACTIVITY_FACTOR = { sedentary: 1.2, light: 1.35, moderate: 1.5, high: 1.7 } as const

export function calculateProteinRange(profile: Pick<UserProfile, 'weightKg' | 'goalType'>) {
  const multiplier = profile.goalType === 'muscle_gain' ? [1.6, 2.0] : profile.goalType === 'recomposition' ? [1.4, 1.8] : [1.2, 1.6]
  return { minG: Math.round(profile.weightKg * multiplier[0]), maxG: Math.round(profile.weightKg * multiplier[1]) }
}

export function calculateGoalPlan(profile: UserProfile, options: { disableAutomaticTargets?: boolean } = {}): GoalPlan {
  const timestamp = new Date().toISOString()
  const disableAutomaticTargets = options.disableAutomaticTargets || profile.healthRiskFlags.length > 0 || Boolean(profile.safetyFlag)
  const ree = estimateRee(profile)
  const protein = calculateProteinRange(profile)
  const factor = ACTIVITY_FACTOR[profile.activityLevel] ?? ACTIVITY_FACTOR.light
  const tdee = ree.value === null ? undefined : Math.round(ree.value * factor)
  const adjustment = profile.goalType === 'fat_loss' ? -250 : profile.goalType === 'muscle_gain' ? 200 : 0
  const energyTargetKcal = disableAutomaticTargets || tdee === undefined ? undefined : Math.max(1200, tdee + adjustment)
  return { id: `goal_${crypto.randomUUID()}`, mode: profile.mode, schemaVersion: 1, createdAt: timestamp, updatedAt: timestamp, profileId: profile.id, strategy: profile.goalType, targetWeightKg: profile.targetWeightKg, energyTargetKcal, proteinMinG: disableAutomaticTargets ? undefined : protein.minG, proteinMaxG: disableAutomaticTargets ? undefined : protein.maxG, version: 1, rationale: disableAutomaticTargets ? '存在安全边界或数据不足，仅保留手工记录。' : `基于 ${ree.methodVersion} 与活动系数 ${factor} 的估算目标。`, methodVersion: 'goal-plan-v1', assumptions: ['成年健康用户', '能量目标为估算，不是医学处方'], limitations: ['个体差异、烹饪误差和日间波动未完全建模'] }
}

export function calculateEstimatedBalance(input: { intakeKcal: number | null; tdeeKcal: number | null }): { kcal: number | null; kind: 'deficit' | 'surplus' | 'unknown' } {
  if (input.intakeKcal === null || input.tdeeKcal === null) return { kcal: null, kind: 'unknown' }
  const kcal = Math.round(input.tdeeKcal - input.intakeKcal)
  return { kcal, kind: kcal > 0 ? 'deficit' : kcal < 0 ? 'surplus' : 'unknown' }
}
