import { analyzeRecordQuality, calculateTrainingCompletion, estimateDailyBalance, sumMealNutrients } from '../domain/calculation'
import { db, repo } from '../db/database'
import { createId, nowIso, todayLocalDate } from '../shared/utils'
import type { AgentRun, Mode, PlanProposal, ToolTrace } from '../shared/types'
import { generateWeeklyReview, type ReadOnlyToolName } from './modelAdapter'

export async function runWeeklyReview(mode: Mode, profileId: string, modelConsentGranted = false) {
  const profile = await repo.getProfile(mode); const plan = await repo.getLatestPlan(mode, profileId); if (!profile || !plan) throw new Error('PROFILE_OR_PLAN_MISSING')
  const endDate = todayLocalDate(); const startDate = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10); const meals = (await repo.listMeals(mode)).filter((meal) => meal.localDate >= startDate && meal.localDate <= endDate); const exercises = (await repo.listExercises(mode)).filter((exercise) => exercise.localDate >= startDate && exercise.localDate <= endDate); const runId = createId('run'); const traces: ToolTrace[] = []
  const trace = async (toolName: string, purpose: string, inputSummary: string, outputSummary: string) => { const t: ToolTrace = { ...({ id: createId('trace'), mode, schemaVersion: 1, createdAt: nowIso(), updatedAt: nowIso() }), runId, toolName, purpose, inputSummary, outputSummary, status: 'success', durationMs: 1 }; traces.push(t); return t }
  await trace('get_profile', 'weekly_review', `mode=${mode}`, '成年画像与目标已读取')
  await trace('list_meals', 'weekly_review', '最近 14 天', `${meals.length} 条餐食`)
  await trace('list_exercises', 'weekly_review', '最近 14 天', `${exercises.length} 条运动`)
  const quality = analyzeRecordQuality(meals, exercises); const trainingCompletionPercent = calculateTrainingCompletion(plan); await trace('analyze_trends', 'weekly_review', '14 天窗口', `记录完整率 ${quality.coveragePercent}%，训练完成率 ${trainingCompletionPercent}%`)
  const nutrients = sumMealNutrients(meals); const balance = estimateDailyBalance(profile, exercises, profile.goalType); await trace('calculate_daily_balance', 'weekly_review', '确定性公式', `摄入 kcal ${nutrients.kcal ?? '未知'}，日消耗 ${balance.kcal ?? '未知'}`)
  const evidenceQuality = quality.evidenceQuality; const needsMoreData = evidenceQuality === 'low'; const currentSets = plan.sessions[1]?.exercises[0]?.sets ?? 3
  const fallbackChanges = needsMoreData ? [] : [{ field: 'training.sessions[1].exercises[0].sets', before: currentSets, after: Math.max(2, currentSets - 1), reason: '记录完整率中等，先降低一组并观察恢复反馈' }]
  const executeTool = async (toolName: ReadOnlyToolName, argumentsValue: Record<string, unknown>) => {
    if (!new Set<ReadOnlyToolName>(['get_profile', 'list_meals', 'list_exercises', 'analyze_trends', 'calculate_daily_balance']).has(toolName)) throw new Error('TOOL_NOT_ALLOWED')
    if (argumentsValue.mode !== mode) throw new Error('MODE_SCOPE_MISMATCH')
    if (toolName === 'get_profile') { await trace(toolName, 'weekly_review', `mode=${mode}`, '成年画像与目标已读取'); return { ageYears: profile.ageYears, heightCm: profile.heightCm, weightKg: profile.weightKg, goalType: profile.goalType, equipment: profile.equipment } }
    if (toolName === 'list_meals') { await trace(toolName, 'weekly_review', `mode=${mode}; days=${argumentsValue.days ?? 14}`, `${meals.length} 条餐食`); return meals.map((meal) => ({ localDate: meal.localDate, mealType: meal.mealType, items: meal.items.map((item) => ({ foodName: item.foodName, massGrams: item.massGrams, confirmed: item.isUserConfirmed })) })) }
    if (toolName === 'list_exercises') { await trace(toolName, 'weekly_review', `mode=${mode}; days=${argumentsValue.days ?? 14}`, `${exercises.length} 条运动`); return exercises.map((exercise) => ({ localDate: exercise.localDate, activityCode: exercise.activityCode, durationMin: exercise.durationMin, intensity: exercise.intensity })) }
    if (toolName === 'analyze_trends') { await trace(toolName, 'weekly_review', `mode=${mode}; days=${argumentsValue.days ?? 14}`, `记录完整率 ${quality.coveragePercent}%`); return quality }
    await trace(toolName, 'weekly_review', `mode=${mode}`, `日消耗 ${balance.kcal ?? '未知'}`); return balance
  }
  const model = await generateWeeklyReview({ mode, coveragePercent: quality.coveragePercent, trainingCompletionPercent, evidenceQuality, mealCount: meals.length, exerciseCount: exercises.length, intakeKcal: nutrients.kcal, estimatedDailyKcal: balance.kcal, currentPlanVersion: plan.version }, modelConsentGranted, executeTool)
  const modelValue = model.value
  const proposalNeedsMoreData = needsMoreData || modelValue?.evidenceQuality === 'low'
  const safeModelChanges = modelValue?.changes.filter((change) => change.field === 'training.sessions[1].exercises[0].sets' && change.after >= 2 && change.after <= currentSets && change.after !== currentSets).map((change) => ({ ...change, before: currentSets })) ?? fallbackChanges
  const proposal: PlanProposal = { id: createId('proposal'), mode, schemaVersion: 1, createdAt: nowIso(), updatedAt: nowIso(), profileId, basePlanVersion: plan.version, status: proposalNeedsMoreData ? 'needs_more_data' : 'awaiting_approval', windowStart: startDate, windowEnd: endDate, evidenceQuality: modelValue?.evidenceQuality ?? evidenceQuality, changes: proposalNeedsMoreData ? [] : safeModelChanges, rationale: proposalNeedsMoreData ? '当前记录覆盖不足，暂不调整计划。' : modelValue?.rationale ?? `记录完整率 ${quality.coveragePercent}%，当前计划版本 ${plan.version}；建议小幅调整训练量并补充缺失记录。`, limitations: modelValue?.limitations ?? ['能量和体重趋势均为估算，不能替代医学建议', '模型未参与关键算术'], observations: [`窗口内餐食 ${meals.length} 条，运动 ${exercises.length} 条`], createdBy: 'agent' }
  const run: AgentRun = { id: runId, mode, schemaVersion: 1, createdAt: nowIso(), updatedAt: nowIso(), profileId, status: proposalNeedsMoreData ? 'needs_more_data' : 'completed', purpose: 'weekly_review', summary: proposal.rationale, toolTraceIds: traces.map((t) => t.id), proposalId: proposal.id }
  await repo.putRun(run); await repo.putProposal(proposal); for (const t of traces) await dbTrace(t)
  return { run, proposal, traces, quality, trainingCompletionPercent, nutrients, balance, modelStatus: model.status, modelMessage: model.message }
}

async function dbTrace(trace: ToolTrace) { await db.traces.put(trace); await db.audit.put({ id: trace.id, mode: trace.mode, schemaVersion: 1, createdAt: trace.createdAt, updatedAt: trace.updatedAt, action: `tool:${trace.toolName}`, entityId: trace.runId, summary: `${trace.inputSummary} → ${trace.outputSummary}` }) }
