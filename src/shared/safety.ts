import type { ActivityLevel, GoalType } from './types'

export interface ProfileSafetyInput { ageYears: number; heightCm: number; weightKg: number; targetWeightKg?: number; goalType: GoalType; healthRiskFlags: string[]; activityLevel?: ActivityLevel; reportsPersistentDiscomfort?: boolean }
export interface SafetyDecision { allowed: boolean; reasons: string[]; disableAutomaticTargets: boolean }
