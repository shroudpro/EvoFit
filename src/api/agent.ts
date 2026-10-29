import { analyzeRecordQuality, estimateDailyBalance, sumMealNutrients } from '../domain/calculation'
import { db, repo } from '../db/database'
import { createId, nowIso } from '../shared/utils'
import type { AgentRun, Mode, PlanProposal, ToolTrace } from '../shared/types'

export async function runWeeklyReview(mode: Mode, profileId: string) {
  const profile = await repo.getProfile(mode); const plan = await repo.getLatestPlan(mode, profileId); if (!profile || !plan) throw new Error('PROFILE_OR_PLAN_MISSING')
  const meals = await repo.listMeals(mode); const exercises = await repo.listExercises(mode); const runId = createId('run'); const traces: ToolTrace[] = []
  const trace = async (toolName: string, purpose: string, inputSummary: string, outputSummary: string) => { const t: ToolTrace = { ...({ id: createId('trace'), mode, schemaVersion: 1, createdAt: nowIso(), updatedAt: nowIso() }), runId, toolName, purpose, inputSummary, outputSummary, status: 'success', durationMs: 1 }; traces.push(t); return t }
  await trace('get_profile', 'weekly_review', `mode=${mode}`, '成年画像与目标已读取')
  await trace('list_meals', 'weekly_review', '最近 14 天', `${meals.length} 条餐食`)
  await trace('list_exercises', 'weekly_review', '最近 14 天', `${exercises.length} 条运动`)
  const quality = analyzeRecordQuality(meals, exercises); await trace('analyze_trends', 'weekly_review', '14 天窗口', `记录完整率 ${quality.coveragePercent}%`)
  const nutrients = sumMealNutrients(meals); const balance = estimateDailyBalance(profile, exercises, profile.goalType); await trace('calculate_daily_balance', 'weekly_review', '确定性公式', `摄入 kcal ${nutrients.kcal ?? '未知'}，日消耗 ${balance.kcal ?? '未知'}`)
  const evidenceQuality = quality.evidenceQuality; const needsMoreData = evidenceQuality === 'low'; const currentSets = plan.sessions[1]?.exercises[0]?.sets ?? 3; const proposal: PlanProposal = { id: createId('proposal'), mode, schemaVersion: 1, createdAt: nowIso(), updatedAt: nowIso(), profileId, basePlanVersion: plan.version, status: needsMoreData ? 'needs_more_data' : 'awaiting_approval', windowStart: '最近 14 天', windowEnd: nowIso().slice(0, 10), evidenceQuality, changes: needsMoreData ? [] : [{ field: 'training.sessions[1].exercises[0].sets', before: currentSets, after: Math.max(2, currentSets - 1), reason: '记录完整率中等，先降低一组并观察恢复反馈' }], rationale: needsMoreData ? '当前记录覆盖不足，暂不调整计划。' : `记录完整率 ${quality.coveragePercent}%，当前计划版本 ${plan.version}；建议小幅调整训练量并补充缺失记录。`, limitations: ['能量和体重趋势均为估算，不能替代医学建议', '模型未参与关键算术'], createdBy: 'agent' }
  const run: AgentRun = { id: runId, mode, schemaVersion: 1, createdAt: nowIso(), updatedAt: nowIso(), profileId, status: needsMoreData ? 'needs_more_data' : 'completed', purpose: 'weekly_review', summary: proposal.rationale, toolTraceIds: traces.map((t) => t.id), proposalId: proposal.id }
  await repo.putRun(run); await repo.putProposal(proposal); for (const t of traces) await dbTrace(t)
  return { run, proposal, traces, quality, nutrients, balance }
}

async function dbTrace(trace: ToolTrace) { await db.traces.put(trace); await db.audit.put({ id: trace.id, mode: trace.mode, schemaVersion: 1, createdAt: trace.createdAt, updatedAt: trace.updatedAt, action: `tool:${trace.toolName}`, entityId: trace.runId, summary: `${trace.inputSummary} → ${trace.outputSummary}` }) }
