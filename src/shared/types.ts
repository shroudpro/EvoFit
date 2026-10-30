export type Mode = 'real' | 'demo'
export type GoalType = 'fat_loss' | 'recomposition' | 'muscle_gain'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type ProposalStatus = 'awaiting_approval' | 'applied' | 'rejected' | 'expired' | 'failed' | 'needs_more_data'

export interface EntityBase { id: string; mode: Mode; createdAt: string; updatedAt: string; schemaVersion: 1 }

export interface UserProfile extends EntityBase {
  ageYears: number; heightCm: number; weightKg: number; sexForEquation?: 'female' | 'male' | 'unspecified'
  goalType: GoalType; targetWeightKg?: number; exerciseExperience: 'beginner' | 'intermediate'
  equipment: 'dorm' | 'gym' | 'mixed'; timeZone: string; healthDeclaration: boolean; safetyFlag?: string
}

export interface NutritionPer100g { kcal: number | null; proteinG: number | null; fatG: number | null; carbsG: number | null; source: string }
export interface MealItem { id: string; foodName: string; massGrams: number; nutritionPer100g: NutritionPer100g; cookingMethod?: string; isUserConfirmed: boolean }
export interface Meal extends EntityBase { localDate: string; mealType: MealType; items: MealItem[]; source: 'manual' | 'image_mock' | 'image_model'; note?: string }
export interface ExerciseLog extends EntityBase { localDate: string; activityCode: string; activityName: string; durationMin: number; massKg: number; intensity?: 'light' | 'moderate' | 'vigorous'; speedKmh?: number; inclinePercent?: number; inclineDegrees?: number; met?: number; netEnergyKcal?: number; methodVersion: string; source: 'manual' | 'nl_mock' | 'nl_model' }
export interface TrainingExercise { id: string; name: string; muscle: string; equipment: string; sets: number; reps: string; restSec: number; note: string; status: 'planned' | 'completed' | 'skipped'; completedAt?: string; skippedAt?: string }
export interface TrainingPlan extends EntityBase { profileId: string; version: number; weekStart: string; strategy: GoalType; sessions: Array<{ day: number; label: string; exercises: TrainingExercise[] }> }
export interface PlanChange { field: string; before: string | number; after: string | number; reason: string }
export interface PlanProposal extends EntityBase { profileId: string; basePlanVersion: number; status: ProposalStatus; windowStart: string; windowEnd: string; evidenceQuality: 'low' | 'medium' | 'high'; changes: PlanChange[]; rationale: string; limitations: string[]; createdBy: 'agent' }
export interface ToolTrace extends EntityBase { runId: string; toolName: string; purpose: string; inputSummary: string; outputSummary: string; status: 'success' | 'error'; durationMs: number }
export interface AgentRun extends EntityBase { profileId: string; status: 'completed' | 'failed' | 'needs_more_data'; purpose: string; summary: string; toolTraceIds: string[]; proposalId?: string }
export interface AuditEvent extends EntityBase { action: string; entityId: string; summary: string }

export interface DemoDataset { datasetVersion: string; isSynthetic: true; mode: 'demo'; profile: UserProfile; plan: TrainingPlan; meals: Meal[]; exercises: ExerciseLog[]; bodyWeights: Array<{ date: string; weightKg: number }> }
