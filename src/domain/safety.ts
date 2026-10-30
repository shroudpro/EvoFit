import type { ProfileSafetyInput, SafetyDecision } from '../shared/safety'

const RISK_LABELS: Record<string, string> = { pregnancy: '孕期/哺乳期需要专业指导', eating_disorder: '存在进食障碍风险', disease_management: '存在疾病管理需求', persistent_discomfort: '报告了持续不适' }

export function evaluateProfileSafety(input: ProfileSafetyInput): SafetyDecision {
  const reasons: string[] = []
  if (input.ageYears < 18) reasons.push('仅支持年满 18 岁用户。')
  if (input.heightCm < 100 || input.heightCm > 250 || input.weightKg < 25 || input.weightKg > 400) reasons.push('身高或体重超出工程输入范围。')
  const bmi = input.weightKg / Math.pow(input.heightCm / 100, 2)
  if (bmi < 12 || bmi > 60) reasons.push('身高体重组合明显异常，需先咨询专业人士。')
  for (const flag of input.healthRiskFlags) if (RISK_LABELS[flag]) reasons.push(RISK_LABELS[flag])
  if (input.reportsPersistentDiscomfort && !input.healthRiskFlags.includes('persistent_discomfort')) reasons.push(RISK_LABELS.persistent_discomfort)
  if (input.targetWeightKg !== undefined && Math.abs(input.targetWeightKg - input.weightKg) / input.weightKg > 0.2) reasons.push('目标体重与当前体重差异过大，暂不自动生成目标。')
  const medicalRisk = input.healthRiskFlags.length > 0 || Boolean(input.reportsPersistentDiscomfort)
  return { allowed: reasons.length === 0, reasons, disableAutomaticTargets: reasons.length > 0 || medicalRisk }
}
