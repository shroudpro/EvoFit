import { analyzeRecordQuality, calculateTrainingCompletion } from '../domain/calculation'
import { summarizeBodyMetrics } from '../domain/bodyMetrics'
import { repo } from '../db/database'
import type { GoalPlan, Mode, TrainingPlan, UserProfile } from '../shared/types'
import { todayLocalDate } from '../shared/utils'

export const COACH_SYSTEM_PROMPT = `你是 EvoFit 的个性化 AI 健康教练。应用已经提供了用户画像、目标、当前训练计划和最近摘要，这些是已知事实；不要要求用户重复输入已经存在的数据。

对 BMI、当前目标、活动水平、计划版本等确定性问题，直接依据上下文回答，不调用工具。对餐食、运动、身体趋势等历史问题，按需调用只读工具。对训练或计划修改请求，必须调用 create_plan_proposal 生成待审批提案，禁止直接修改计划。禁止调用任何不存在的写入工具。

只有真正缺少数据时才询问用户补充。所有 BMI、能量和趋势结果都要说明是工程估算或参考信息，不构成医学诊断。回答保持自然、具体、简洁，优先使用用户已保存的数据。`

export interface ChatContext {
  systemPrompt: string
  profile: Pick<UserProfile, 'ageYears' | 'heightCm' | 'weightKg' | 'sexForEquation' | 'goalType' | 'targetWeightKg' | 'activityLevel' | 'equipment' | 'availableMinutesPerDay' | 'healthRiskFlags' | 'allergies' | 'mealPreferences'>
  bmi: { value: number; methodVersion: 'bmi-v1'; note: string } | null
  goal: Pick<GoalPlan, 'strategy' | 'targetWeightKg' | 'energyTargetKcal' | 'proteinMinG' | 'proteinMaxG' | 'version' | 'rationale'> | null
  trainingPlan: { version: number; weekStart: string; strategy: TrainingPlan['strategy']; sessions: Array<{ day: number; label: string; exercises: Array<{ name: string; sets: number; reps: string; status: string; scheduledDate?: string }> }> } | null
  recentSummary: { windowDays: 14; mealCount: number; exerciseCount: number; mealDays: number; exerciseDays: number; coveragePercent: number; trainingCompletionPercent: number; bodyMetricCount: number; bodyMetricTrend: 'up' | 'down' | 'stable' | 'unknown' }
  localDate: string
  timeZone: string
}

function calculateBmi(weightKg: number, heightCm: number) {
  if (!Number.isFinite(weightKg) || !Number.isFinite(heightCm) || weightKg <= 0 || heightCm <= 0) return null
  return Math.round((weightKg / Math.pow(heightCm / 100, 2)) * 10) / 10
}

export async function buildChatContext(mode: Mode, profileId: string): Promise<ChatContext> {
  const profile = await repo.getProfile(mode)
  if (!profile || profile.id !== profileId) throw new Error('PROFILE_NOT_FOUND')
  const plan = await repo.getLatestPlan(mode, profileId)
  const goal = (await repo.listGoals(mode, profileId))[0] ?? null
  const meals = (await repo.listMeals(mode)).filter((row) => row.localDate >= new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10))
  const exercises = (await repo.listExercises(mode)).filter((row) => row.localDate >= new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10))
  const bodyMetrics = await repo.listBodyMetrics(mode, 14)
  const quality = analyzeRecordQuality(meals, exercises, 14)
  const latestPlan = plan ? { version: plan.version, weekStart: plan.weekStart, strategy: plan.strategy, sessions: plan.sessions.map((session) => ({ day: session.day, label: session.label, exercises: session.exercises.map((exercise) => ({ name: exercise.name, sets: exercise.sets, reps: exercise.reps, status: exercise.status, scheduledDate: exercise.scheduledDate })) })) } : null
  const bmi = calculateBmi(profile.weightKg, profile.heightCm)
  const trend = summarizeBodyMetrics(bodyMetrics).direction
  return {
    systemPrompt: COACH_SYSTEM_PROMPT,
    profile: { ageYears: profile.ageYears, heightCm: profile.heightCm, weightKg: profile.weightKg, sexForEquation: profile.sexForEquation, goalType: profile.goalType, targetWeightKg: profile.targetWeightKg, activityLevel: profile.activityLevel, equipment: profile.equipment, availableMinutesPerDay: profile.availableMinutesPerDay, healthRiskFlags: profile.healthRiskFlags, allergies: profile.allergies, mealPreferences: profile.mealPreferences },
    bmi: bmi === null ? null : { value: bmi, methodVersion: 'bmi-v1', note: '基于当前画像身高和体重的工程参考值，不构成医学诊断。' },
    goal: goal ? { strategy: goal.strategy, targetWeightKg: goal.targetWeightKg, energyTargetKcal: goal.energyTargetKcal, proteinMinG: goal.proteinMinG, proteinMaxG: goal.proteinMaxG, version: goal.version, rationale: goal.rationale } : null,
    trainingPlan: latestPlan,
    recentSummary: { windowDays: 14, mealCount: meals.length, exerciseCount: exercises.length, mealDays: quality.mealDays, exerciseDays: quality.exerciseDays, coveragePercent: quality.coveragePercent, trainingCompletionPercent: plan ? calculateTrainingCompletion(plan) : 0, bodyMetricCount: bodyMetrics.length, bodyMetricTrend: trend },
    localDate: todayLocalDate(),
    timeZone: profile.timeZone,
  }
}

export function isLocalReadOnlyQuery(message: string) {
  return /BMI|体质指数|体重指数|我的年龄|我的身高|我的体重|当前目标|活动水平|计划版本/i.test(message)
}

export function formatLocalReadOnlyAnswer(message: string, context: ChatContext) {
  if (/BMI|体质指数|体重指数/i.test(message)) return context.bmi ? `根据你当前保存的画像，你的 BMI 是 ${context.bmi.value.toFixed(1)}。计算使用身高 ${context.profile.heightCm} cm 和体重 ${context.profile.weightKg} kg；这是工程参考值，不构成医学诊断。` : '当前画像缺少有效身高或体重，暂时无法计算 BMI。'
  if (/年龄/.test(message)) return `你当前画像中的年龄是 ${context.profile.ageYears} 岁。`
  if (/身高/.test(message)) return `你当前画像中的身高是 ${context.profile.heightCm} cm。`
  if (/体重/.test(message)) return `你当前画像中的体重是 ${context.profile.weightKg} kg。`
  if (/目标/.test(message)) return context.goal ? `你当前的目标是${context.goal.strategy === 'fat_loss' ? '合理减脂' : context.goal.strategy === 'muscle_gain' ? '基础增肌' : '身体重组'}。${context.goal.targetWeightKg ? `目标体重为 ${context.goal.targetWeightKg} kg。` : ''}` : `你当前画像中的目标是${context.profile.goalType === 'fat_loss' ? '合理减脂' : context.profile.goalType === 'muscle_gain' ? '基础增肌' : '身体重组'}。`
  if (/活动水平/.test(message)) return `你当前记录的活动水平是 ${context.profile.activityLevel}。`
  if (/计划版本/.test(message)) return context.trainingPlan ? `你当前训练计划是 v${context.trainingPlan.version}，周期从 ${context.trainingPlan.weekStart} 开始。` : '当前还没有训练计划。'
  return ''
}
