import { afterEach, describe, expect, it, vi } from 'vitest'
import { analyzeImage, generateWeeklyReview, parseExercise } from '../../src/api/modelAdapter'

describe('真实模型适配器', () => {
  afterEach(() => vi.restoreAllMocks())

  it('requires explicit consent before sending data', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const result = await parseExercise('跑步 30 分钟')
    expect(result.status).toBe('failed')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('parses a validated structured exercise response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ result: { output_text: JSON.stringify({ activityCode: 'running', activityName: '跑步', durationMin: 30, speedKmh: null, inclinePercent: null, inclineDegrees: null, intensity: 'moderate', missing: [] }) } }), { status: 200 }))
    const result = await parseExercise('跑步 30 分钟', false, true)
    expect(result.status).toBe('connected')
    expect(result.value?.durationMin).toBe(30)
  })

  it('sends the session-only preview token to the Function', async () => {
    sessionStorage.setItem('evofit-preview-token', 'preview-secret')
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ result: { output_text: JSON.stringify({ activityCode: 'running', activityName: '跑步', durationMin: 30, speedKmh: null, inclinePercent: null, inclineDegrees: null, intensity: 'moderate', missing: [] }) } }), { status: 200 }))
    await parseExercise('跑步 30 分钟', false, true)
    expect(fetchSpy.mock.calls[0]?.[1]?.headers).toMatchObject({ Authorization: 'Bearer preview-secret' })
    sessionStorage.removeItem('evofit-preview-token')
  })

  it('degrades when the provider returns invalid structured data', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ result: { output_text: '{"items":[]}' } }), { status: 200 }))
    const file = new File(['image'], 'meal.png', { type: 'image/png' })
    const result = await analyzeImage(file, false, true)
    expect(result.status).toBe('failed')
    expect(result.value).toBeUndefined()
  })

  it('returns an explicit timeout degradation when the provider aborts', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new DOMException('aborted', 'AbortError'))
    const result = await parseExercise('跑步 30 分钟', false, true)
    expect(result.status).toBe('failed')
    expect(result.message).toContain('超时')
  })

  it('executes an allowlisted local read-only tool before accepting the review', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ result: { id: 'resp_1', output: [{ type: 'function_call', name: 'analyze_trends', arguments: '{"mode":"demo","days":14}', call_id: 'call_1' }] } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ result: { output_text: JSON.stringify({ evidenceQuality: 'medium', rationale: '基于记录质量给出保守建议。', changes: [], limitations: ['估算值'] }) } }), { status: 200 }))
    const calls: string[] = []
    const result = await generateWeeklyReview({ mode: 'demo' }, true, async (name) => { calls.push(name); return { coveragePercent: 70 } })
    expect(result.status).toBe('connected')
    expect(result.value?.evidenceQuality).toBe('medium')
    expect(calls).toEqual(['analyze_trends'])
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(String(fetchSpy.mock.calls[1]?.[1]?.body)).toContain('function_call_output')
  })
})
