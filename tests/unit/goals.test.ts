import { describe, expect, it } from 'vitest'
import { calculateEstimatedBalance, calculateGoalPlan, calculateProteinRange } from '../../src/domain/goals'
import type { UserProfile } from '../../src/shared/types'

const profile: UserProfile = { id: 'p', mode: 'real', schemaVersion: 1, createdAt: '2026-10-30', updatedAt: '2026-10-30', ageYears: 30, heightCm: 170, weightKg: 70, sexForEquation: 'male', goalType: 'fat_loss', exerciseExperience: 'beginner', equipment: 'mixed', timeZone: 'Asia/Shanghai', healthDeclaration: true, activityLevel: 'light', availableMinutesPerDay: 30, healthRiskFlags: [], allergies: [], mealPreferences: [] }
describe('goal calculations', () => {
  it('calculates bounded protein and an estimated target', () => { const range = calculateProteinRange(profile); expect(range.minG).toBe(84); expect(range.maxG).toBe(112); expect(calculateGoalPlan(profile).energyTargetKcal).toBeGreaterThanOrEqual(1200) })
  it('does not invent automatic targets without safety clearance', () => { const plan = calculateGoalPlan({ ...profile, healthRiskFlags: ['disease_management'] }, { disableAutomaticTargets: true }); expect(plan.energyTargetKcal).toBeUndefined(); expect(plan.proteinMinG).toBeUndefined() })
  it('distinguishes deficit, surplus and unknown', () => { expect(calculateEstimatedBalance({ intakeKcal: 1800, tdeeKcal: 2200 })).toEqual({ kcal: 400, kind: 'deficit' }); expect(calculateEstimatedBalance({ intakeKcal: null, tdeeKcal: 2200 }).kind).toBe('unknown') })
})
