export const nowIso = () => new Date().toISOString()
export const todayLocalDate = () => new Date().toISOString().slice(0, 10)
export const createId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`
export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
