import type { FoodDraft } from '../types/domain'

export function createBlankFood(): FoodDraft {
  return {
    name: '',
    brand: '',
    servingSize: '1 serving',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    source: 'manual',
  }
}
