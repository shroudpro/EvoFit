import { exerciseParseSchema, type ExerciseParse } from '../shared/schemas'

export type ModelStatus = 'unconfigured' | 'mock' | 'connected'
export interface ModelResult<T> { status: ModelStatus; value?: T; message: string }

const mockExercise = (text: string): ExerciseParse => { const duration = Number(text.match(/(\d+)\s*分钟/)?.[1] ?? 0); const speed = Number(text.match(/([\d.]+)\s*km\/h/i)?.[1] ?? 0); const incline = Number(text.match(/([\d.]+)\s*%/)?.[1] ?? 0); return exerciseParseSchema.parse({ activityName: text.includes('跑步机') ? '跑步机快走' : '待确认运动', durationMin: duration, speedKmh: speed || undefined, inclinePercent: incline || undefined, missing: duration && (speed || incline) ? [] : ['运动类型或强度'] }) }

export async function parseExercise(text: string, useMock = false): Promise<ModelResult<ExerciseParse>> {
  if (useMock) return { status: 'mock', value: mockExercise(text), message: '使用明确标记的测试模拟，未调用真实模型。' }
  return { status: 'unconfigured', message: '真实模型未连接；请配置服务器 Function，当前可继续手工录入。' }
}

export async function analyzeImage(_file: File, useMock = false): Promise<ModelResult<{ foodName: string; massGrams: number; confidenceNote: string }[]>> {
  if (useMock) return { status: 'mock', value: [{ foodName: '待确认餐食', massGrams: 100, confidenceNote: '测试模拟候选，请用户修改名称和重量。' }], message: '使用明确标记的测试模拟，未调用真实模型。' }
  return { status: 'unconfigured', message: '真实图像模型未连接；图片未上传，建议使用手工入口。' }
}
