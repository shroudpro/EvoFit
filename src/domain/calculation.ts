import type { ExerciseLog, GoalType, Meal, NutritionPer100g, UserProfile } from '../shared/types'

export interface CalculationResult<T> { value: T; unit: string; methodVersion: string; source: string; assumptions: string[]; limitations: string[] }

export function estimateRee(profile: Pick<UserProfile, 'ageYears' | 'heightCm' | 'weightKg' | 'sexForEquation'>): CalculationResult<number | null> {
  if (profile.ageYears < 18 || profile.heightCm <= 0 || profile.weightKg <= 0 || profile.sexForEquation === 'unspecified' || !profile.sexForEquation) return { value: null, unit: 'kcal/day', methodVersion: 'ree-mifflin-st-jeor-v1', source: 'Mifflin–St Jeor (PMID 2305711)', assumptions: ['成年健康用户'], limitations: ['生理参数未提供，无法计算性别项'] }
  const sexConstant = profile.sexForEquation === 'male' ? 5 : -161
  return { value: Math.round(10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.ageYears + sexConstant), unit: 'kcal/day', methodVersion: 'ree-mifflin-st-jeor-v1', source: 'Mifflin–St Jeor (PMID 2305711)', assumptions: ['成年健康用户', '体重、身高和年龄单位有效'], limitations: ['结果为估算，不是临床测量'] }
}

export function convertKjToKcal(kj: number): CalculationResult<number> { return { value: Math.round((kj / 4.184) * 10) / 10, unit: 'kcal', methodVersion: 'energy-kj-kcal-v1', source: '国际能量单位换算', assumptions: ['输入为 kJ'], limitations: ['标签四舍五入会带来误差'] } }

export function calculateFoodNutrients(reference: NutritionPer100g, massGrams: number): CalculationResult<NutritionPer100g> {
  if (massGrams <= 0) throw new Error('massGrams must be positive')
  const scale = massGrams / 100
  const scaleNullable = (value: number | null) => value === null ? null : Math.round(value * scale * 10) / 10
  return { value: { kcal: scaleNullable(reference.kcal), proteinG: scaleNullable(reference.proteinG), fatG: scaleNullable(reference.fatG), carbsG: scaleNullable(reference.carbsG), source: reference.source }, unit: `per ${massGrams} g`, methodVersion: 'food-nutrients-linear-v1', source: reference.source, assumptions: ['营养值按每 100 g 线性换算'], limitations: ['烹饪失水和配方差异未建模', '未知营养项保留为 null'] }
}

const MET: Record<string, number> = { treadmill_walk: 4.3, running: 8, cycling: 7.5, strength: 3.5, yoga: 2.5 }
export function lookupMet(activityCode: string, intensity?: ExerciseLog['intensity']): number | null { const base = MET[activityCode]; if (!base) return null; if (intensity === 'light') return Math.max(1.5, base - 1); if (intensity === 'vigorous') return base + 1; return base }
export function estimateExerciseEnergy(activity: Pick<ExerciseLog, 'activityCode' | 'durationMin' | 'massKg' | 'intensity'>): CalculationResult<{ grossKcal: number; netKcal: number; met: number | null }> {
  const met = lookupMet(activity.activityCode, activity.intensity)
  if (!met) return { value: { grossKcal: 0, netKcal: 0, met: null }, unit: 'kcal', methodVersion: 'met-compendium-lite-v1', source: '2024 Adult Compendium mapping', assumptions: [], limitations: ['活动类型缺少 MET，需补充强度或人工选择'] }
  const gross = met * 3.5 * activity.massKg / 200 * activity.durationMin
  const baseline = 1 * 3.5 * activity.massKg / 200 * activity.durationMin
  return { value: { grossKcal: Math.round(gross), netKcal: Math.max(0, Math.round(gross - baseline)), met }, unit: 'kcal', methodVersion: 'met-compendium-lite-v1', source: '2024 Adult Compendium mapping', assumptions: ['净消耗扣除同时间静息基线，避免重复计量'], limitations: ['MET 为活动档位估算'] }
}

export function sumMealNutrients(meals: Meal[]): { kcal: number | null; proteinG: number | null; fatG: number | null; carbsG: number | null } {
  if (meals.length === 0) return { kcal: null, proteinG: null, fatG: null, carbsG: null }
  const keys = ['kcal', 'proteinG', 'fatG', 'carbsG'] as const
  return Object.fromEntries(keys.map((key) => { const values = meals.flatMap((meal) => meal.items.map((item) => calculateFoodNutrients(item.nutritionPer100g, item.massGrams).value[key])); return [key, values.some((v) => v === null) ? null : values.reduce<number>((sum, value) => sum + (value ?? 0), 0)] })) as { kcal: number | null; proteinG: number | null; fatG: number | null; carbsG: number | null }
}

export function analyzeRecordQuality(meals: Meal[], exercises: ExerciseLog[], days = 14) { const mealDays = new Set(meals.map((m) => m.localDate)).size; const exerciseDays = new Set(exercises.map((e) => e.localDate)).size; const coverage = Math.round(((mealDays + exerciseDays) / (days * 2)) * 100); return { mealDays, exerciseDays, coveragePercent: Math.min(100, coverage), evidenceQuality: coverage >= 70 ? 'high' : coverage >= 40 ? 'medium' : 'low' as 'high' | 'medium' | 'low' } }

export function estimateDailyBalance(profile: Pick<UserProfile, 'ageYears' | 'heightCm' | 'weightKg' | 'sexForEquation'>, exercises: ExerciseLog[], goal: GoalType) { const ree = estimateRee(profile).value; if (ree === null) return { kcal: null, methodVersion: 'daily-balance-v1', limitation: 'REE 数据不足' }; const baseline = ree * 1.35; const extra = exercises.reduce((sum, e) => sum + (e.netEnergyKcal ?? estimateExerciseEnergy(e).value.netKcal), 0); const goalAdjustment = goal === 'fat_loss' ? -250 : goal === 'muscle_gain' ? 200 : 0; return { kcal: Math.round(baseline + extra + goalAdjustment), methodVersion: 'daily-balance-v1', limitation: '估算；基础活动系数不包含额外记录运动' } }
