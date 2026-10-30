import type { BodyMetric } from '../shared/types'

export function summarizeBodyMetrics(metrics: BodyMetric[], days = 14) {
  const rows = [...metrics].sort((a, b) => a.localDate.localeCompare(b.localDate)).slice(-days)
  if (rows.length === 0) return { latest: undefined, deltaKg: null, direction: 'unknown' as const, recordedDays: 0, coveragePercent: 0 }
  const first = rows[0].weightKg; const latest = rows[rows.length - 1]
  const deltaKg = Math.round((latest.weightKg - first) * 100) / 100
  return { latest, deltaKg, direction: deltaKg < -0.05 ? 'down' as const : deltaKg > 0.05 ? 'up' as const : 'stable' as const, recordedDays: rows.length, coveragePercent: Math.round((rows.length / days) * 100) }
}
