import { describe, expect, it } from 'vitest'
import { EvoFitError, isEvoFitError } from '../../src/shared/errors'

describe('统一错误码', () => { it('keeps a stable code for user-facing degradation', () => { const error = new EvoFitError('STORAGE_FAILED', '本地保存失败'); expect(isEvoFitError(error)).toBe(true); expect(error.code).toBe('STORAGE_FAILED') }) })
