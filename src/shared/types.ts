export type Mode = 'real' | 'demo'
export type GoalType = 'fat_loss' | 'recomposition' | 'muscle_gain'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type ProposalStatus = 'awaiting_approval' | 'applied' | 'rejected' | 'expired' | 'failed' | 'needs_more_data'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'high'
export type TrainingExerciseStatus = 'planned' | 'completed' | 'skipped' | 'postponed'

export interface EntityBase { id: string; mode: Mode; createdAt: string; updatedAt: string; schemaVersion: 1 }

export interface UserProfile extends EntityBase {
  ageYears: number; heightCm: number; weightKg: number; sexForEquation?: 'female' | 'male' | 'unspecified'
  goalType: GoalType; targetWeightKg?: number; exerciseExperience: 'beginner' | 'intermediate'
  equipment: 'dorm' | 'gym' | 'mixed'; timeZone: string; healthDeclaration: boolean; safetyFlag?: string
  activityLevel: ActivityLevel; availableMinutesPerDay: number; healthRiskFlags: string[]; allergies: string[]; mealPreferences: string[]
}

export interface NutritionPer100g { kcal: number | null; proteinG: number | null; fatG: number | null; carbsG: number | null; source: string }
export interface MealItem { id: string; foodName: string; massGrams: number; nutritionPer100g: NutritionPer100g; cookingMethod?: string; isUserConfirmed: boolean }
export interface Meal extends EntityBase { localDate: string; mealType: MealType; items: MealItem[]; source: 'manual' | 'image_mock' | 'image_model'; note?: string }
export interface ExerciseLog extends EntityBase { localDate: string; activityCode: string; activityName: string; durationMin: number; massKg: number; intensity?: 'light' | 'moderate' | 'vigorous'; speedKmh?: number; inclinePercent?: number; inclineDegrees?: number; met?: number; netEnergyKcal?: number; methodVersion: string; source: 'manual' | 'nl_mock' | 'nl_model' }
export interface TrainingExercise { id: string; name: string; muscle: string; equipment: string; sets: number; reps: string; restSec: number; note: string; status: TrainingExerciseStatus; completedAt?: string; skippedAt?: string; scheduledDate?: string; weightKg?: number; rpe?: number; alternativeExerciseId?: string; feedback?: string }
export interface TrainingPlan extends EntityBase { profileId: string; version: number; weekStart: string; strategy: GoalType; sessions: Array<{ day: number; label: string; exercises: TrainingExercise[] }> }
export interface PlanChange { field: string; before: string | number; after: string | number; reason: string }
export interface PlanProposal extends EntityBase { profileId: string; basePlanVersion: number; status: ProposalStatus; windowStart: string; windowEnd: string; evidenceQuality: 'low' | 'medium' | 'high'; changes: PlanChange[]; rationale: string; limitations: string[]; createdBy: 'agent' }
export interface ToolTrace extends EntityBase { runId: string; toolName: string; purpose: string; inputSummary: string; outputSummary: string; status: 'success' | 'error'; durationMs: number }
export interface AgentRun extends EntityBase { profileId: string; status: 'completed' | 'failed' | 'needs_more_data'; purpose: string; summary: string; toolTraceIds: string[]; proposalId?: string }
export interface AuditEvent extends EntityBase { action: string; entityId: string; summary: string }

export interface DemoDataset { datasetVersion: string; isSynthetic: true; mode: 'demo'; profile: UserProfile; plan: TrainingPlan; meals: Meal[]; exercises: ExerciseLog[]; bodyWeights: Array<{ date: string; weightKg: number }> }

export interface BodyMetric extends EntityBase { localDate: string; weightKg: number; waistCm?: number; source: 'manual'; note?: string }
export interface GoalPlan extends EntityBase { profileId: string; strategy: GoalType; targetWeightKg?: number; energyTargetKcal?: number; proteinMinG?: number; proteinMaxG?: number; version: number; rationale: string; methodVersion?: string; assumptions?: string[]; limitations?: string[] }
export interface ChatConversation extends EntityBase { profileId: string; title: string; status: 'active' | 'archived' }
export interface ChatMessage extends EntityBase { conversationId: string; role: 'user' | 'assistant' | 'tool'; content: string; status: 'complete' | 'error'; toolCallId?: string; toolName?: string }
export interface SettingRecord { id: 'active'; mode: Mode; provider?: import('./providerConfig').ProviderConfig; aiEnabled?: boolean; lastModelCallAt?: string; updatedAt: string }
export interface FoodCatalogItem extends EntityBase { foodId: string; name: string; nutritionPer100g: NutritionPer100g; source: string; version: string; notes?: string }
export interface ExerciseCatalogItem extends EntityBase { exerciseCode: string; name: string; muscle: string; equipment: string; difficulty: 'beginner' | 'intermediate' | 'advanced'; alternativeExerciseId?: string; caution: string }
