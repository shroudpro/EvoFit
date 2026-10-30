import { describe, expect, it } from 'vitest'
import { evaluateProfileSafety } from '../../src/domain/safety'

const base = { ageYears: 22, heightCm: 168, weightKg: 65, targetWeightKg: 62, goalType: 'fat_loss' as const, healthRiskFlags: [] as string[] }
describe('profile safety', () => {
  it('allows an ordinary adult profile', () => { expect(evaluateProfileSafety(base)).toEqual({ allowed: true, reasons: [], disableAutomaticTargets: false }) })
  it('blocks minors and medical risk flags while preserving manual path', () => { const result = evaluateProfileSafety({ ...base, ageYears: 17, healthRiskFlags: ['disease_management'] }); expect(result.allowed).toBe(false); expect(result.disableAutomaticTargets).toBe(true); expect(result.reasons.join('')).toContain('18') })
  it('blocks extreme target changes', () => { expect(evaluateProfileSafety({ ...base, targetWeightKg: 40 }).disableAutomaticTargets).toBe(true) })
})
