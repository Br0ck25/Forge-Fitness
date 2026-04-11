import type { HeightUnit, WeightUnit } from '../types/domain'

const LB_PER_KG = 2.2046226218
const CM_PER_INCH = 2.54

export function kgToLb(weightKg: number) {
  return weightKg * LB_PER_KG
}

export function lbToKg(weightLb: number) {
  return weightLb / LB_PER_KG
}

export function cmToFeetAndInches(heightCm?: number) {
  if (!heightCm || heightCm <= 0) {
    return { feet: 0, inches: 0 }
  }

  const totalInches = heightCm / CM_PER_INCH
  const feet = Math.floor(totalInches / 12)
  const inches = Math.round((totalInches % 12) * 10) / 10

  return { feet, inches }
}

export function feetAndInchesToCm(feet: number, inches: number) {
  const safeFeet = Number.isFinite(feet) ? Math.max(feet, 0) : 0
  const safeInches = Number.isFinite(inches) ? Math.max(inches, 0) : 0
  const totalInches = safeFeet * 12 + safeInches
  return totalInches > 0 ? Math.round(totalInches * CM_PER_INCH * 10) / 10 : undefined
}

export function formatWeight(weightKg: number | undefined, unit: WeightUnit) {
  if (weightKg == null || weightKg <= 0) {
    return '—'
  }

  if (unit === 'lb') {
    const rounded = Math.round(kgToLb(weightKg) * 10) / 10
    return `${rounded.toFixed(rounded % 1 === 0 ? 0 : 1)} lb`
  }

  const rounded = Math.round(weightKg * 10) / 10
  return `${rounded.toFixed(rounded % 1 === 0 ? 0 : 1)} kg`
}

export function formatHeight(heightCm: number | undefined, unit: HeightUnit) {
  if (!heightCm) {
    return '—'
  }

  if (unit === 'ft-in') {
    const { feet, inches } = cmToFeetAndInches(heightCm)
    return `${feet}′ ${Math.round(inches)}″`
  }

  return `${Math.round(heightCm)} cm`
}
