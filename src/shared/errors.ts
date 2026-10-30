export const EVOFIT_ERROR_CODES = ['MODEL_UNAVAILABLE', 'RATE_LIMITED', 'INVALID_SCHEMA', 'TIMEOUT', 'VISION_UNSUPPORTED', 'STORAGE_FAILED', 'CONSENT_REQUIRED', 'SAFETY_BLOCKED', 'PLAN_VERSION_CONFLICT'] as const
export type EvoFitErrorCode = typeof EVOFIT_ERROR_CODES[number]
export class EvoFitError extends Error { readonly code: EvoFitErrorCode; constructor(code: EvoFitErrorCode, message: string, options?: { cause?: unknown }) { super(message, options); this.name = 'EvoFitError'; this.code = code } }
export function isEvoFitError(error: unknown): error is EvoFitError { return error instanceof EvoFitError }
