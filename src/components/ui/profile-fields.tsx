import type { Profile, UnitSettings } from '../../types/domain'
import { activityLabels } from '../../types/domain'
import {
  cmToFeetAndInches,
  feetAndInchesToCm,
  kgToLb,
  lbToKg,
} from '../../utils/units'

interface ProfileFieldsProps {
  profile: Profile
  units: UnitSettings
  onChange: (profile: Profile) => void
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) {
    return undefined
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function InputLabel({ children }: { children: React.ReactNode }) {
  return <span className="mb-2 block text-sm font-medium text-slate-700">{children}</span>
}

export function ProfileFields({ onChange, profile, units }: ProfileFieldsProps) {
  const { feet, inches } = cmToFeetAndInches(profile.heightCm)
  const displayWeight = profile.weightKg
    ? units.weight === 'lb'
      ? Math.round(kgToLb(profile.weightKg) * 10) / 10
      : Math.round(profile.weightKg * 10) / 10
    : ''

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label>
        <InputLabel>Age</InputLabel>
        <input
          type="number"
          min="0"
          inputMode="numeric"
          value={profile.age ?? ''}
          onChange={(event) =>
            onChange({
              ...profile,
              age: parseOptionalNumber(event.target.value),
            })
          }
          className="input-field"
          placeholder="Optional"
        />
      </label>

      <label>
        <InputLabel>Sex</InputLabel>
        <select
          value={profile.sex ?? ''}
          onChange={(event) =>
            onChange({
              ...profile,
              sex: event.target.value ? (event.target.value as Profile['sex']) : undefined,
            })
          }
          className="input-field"
        >
          <option value="">Optional</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="other">Other / prefer not to say</option>
        </select>
      </label>

      {units.height === 'cm' ? (
        <label>
          <InputLabel>Height (cm)</InputLabel>
          <input
            type="number"
            min="0"
            inputMode="decimal"
            value={profile.heightCm ? Math.round(profile.heightCm * 10) / 10 : ''}
            onChange={(event) =>
              onChange({
                ...profile,
                heightCm: parseOptionalNumber(event.target.value),
              })
            }
            className="input-field"
            placeholder="Optional"
          />
        </label>
      ) : (
        <div>
          <InputLabel>Height (ft / in)</InputLabel>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              min="0"
              inputMode="numeric"
              value={profile.heightCm ? feet : ''}
              onChange={(event) => {
                const nextFeet = parseOptionalNumber(event.target.value) ?? 0
                onChange({
                  ...profile,
                  heightCm: feetAndInchesToCm(nextFeet, inches),
                })
              }}
              className="input-field"
              placeholder="Feet"
            />
            <input
              type="number"
              min="0"
              step="0.5"
              inputMode="decimal"
              value={profile.heightCm ? Math.round(inches * 10) / 10 : ''}
              onChange={(event) => {
                const nextInches = parseOptionalNumber(event.target.value) ?? 0
                onChange({
                  ...profile,
                  heightCm: feetAndInchesToCm(feet, nextInches),
                })
              }}
              className="input-field"
              placeholder="Inches"
            />
          </div>
        </div>
      )}

      <label>
        <InputLabel>Weight ({units.weight === 'lb' ? 'lb' : 'kg'})</InputLabel>
        <input
          type="number"
          min="0"
          step="0.1"
          inputMode="decimal"
          value={displayWeight}
          onChange={(event) => {
            const parsed = parseOptionalNumber(event.target.value)
            onChange({
              ...profile,
              weightKg:
                parsed == null
                  ? undefined
                  : units.weight === 'lb'
                    ? Math.round(lbToKg(parsed) * 10) / 10
                    : parsed,
            })
          }}
          className="input-field"
          placeholder="Optional"
        />
      </label>

      <label className="sm:col-span-2">
        <InputLabel>Activity level</InputLabel>
        <select
          value={profile.activityLevel ?? ''}
          onChange={(event) =>
            onChange({
              ...profile,
              activityLevel: event.target.value
                ? (event.target.value as Profile['activityLevel'])
                : undefined,
            })
          }
          className="input-field"
        >
          <option value="">Optional</option>
          {Object.entries(activityLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
