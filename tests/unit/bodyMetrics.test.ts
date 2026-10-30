import { describe, expect, it } from 'vitest'
import { summarizeBodyMetrics } from '../../src/domain/bodyMetrics'
import type { BodyMetric } from '../../src/shared/types'

const metric = (date: string, weightKg: number): BodyMetric => ({ id: date, mode: 'demo', schemaVersion: 1, createdAt: date, updatedAt: date, localDate: date, weightKg, source: 'manual' })
describe('body metric trends', () => {
  it('returns no trend without data', () => { expect(summarizeBodyMetrics([]).direction).toBe('unknown') })
  it('computes a bounded fourteen day change', () => { const result = summarizeBodyMetrics([metric('2026-10-20', 70), metric('2026-10-30', 69.4)]); expect(result.deltaKg).toBe(-0.6); expect(result.direction).toBe('down') })
})
