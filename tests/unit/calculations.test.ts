import { describe, expect, it } from 'vitest'
import { calculateFoodNutrients, convertKjToKcal, estimateExerciseEnergy, estimateRee, sumMealNutrients } from '../../src/domain/calculation'

describe('确定性计算', () => {
  it('uses Mifflin–St Jeor with documented units', () => { expect(estimateRee({ ageYears: 22, heightCm: 168, weightKg: 66.4, sexForEquation: 'female' }).value).toBe(1443) })
  it('keeps missing sex input unknown', () => { expect(estimateRee({ ageYears: 22, heightCm: 168, weightKg: 66.4, sexForEquation: 'unspecified' }).value).toBeNull() })
  it('converts kJ without discarding source scale', () => { expect(convertKjToKcal(418.4).value).toBe(100) })
  it('scales food values and keeps null nutrients', () => { const result = calculateFoodNutrients({ kcal: 100, proteinG: null, fatG: 2, carbsG: 3, source: 'test' }, 150); expect(result.value.kcal).toBe(150); expect(result.value.proteinG).toBeNull() })
  it('separates gross and net MET energy', () => { const result = estimateExerciseEnergy({ activityCode: 'treadmill_walk', durationMin: 45, massKg: 66.4, intensity: 'moderate' }); expect(result.value.netKcal).toBeLessThan(result.value.grossKcal); expect(result.value.met).toBe(4.3) })
  it('does not sum unknown nutrients as zero', () => { const meal = { id: 'm', mode: 'real' as const, createdAt: '', updatedAt: '', schemaVersion: 1 as const, localDate: '2026-10-29', mealType: 'lunch' as const, source: 'manual' as const, items: [{ id: 'i', foodName: 'x', massGrams: 100, nutritionPer100g: { kcal: 100, proteinG: null, fatG: 2, carbsG: 3, source: 'test' }, isUserConfirmed: true }] }; expect(sumMealNutrients([meal]).proteinG).toBeNull() })
  it('shows empty nutrition as unknown rather than zero', () => { expect(sumMealNutrients([]).kcal).toBeNull() })
})
