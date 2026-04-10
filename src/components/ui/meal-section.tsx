import { PencilLine, Trash2 } from 'lucide-react'
import type { LogEntry, MealKey } from '../../types/domain'
import { MEAL_ORDER, mealLabels } from '../../types/domain'
import { getLogEntryNutrition, sumNutrition } from '../../utils/nutrition'
import { Card } from './card'
import { EmptyState } from './empty-state'

interface MealSectionProps {
  meal: MealKey
  entries: LogEntry[]
  onAdd: () => void
  onEdit: (entry: LogEntry) => void
  onDelete: (entryId: string) => void
  onMove: (entryId: string, meal: MealKey) => void
}

export function MealSection({ entries, meal, onAdd, onDelete, onEdit, onMove }: MealSectionProps) {
  const totals = sumNutrition(entries.map((entry) => getLogEntryNutrition(entry)))

  return (
    <Card className="space-y-4 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-base font-semibold text-slate-950">{mealLabels[meal]}</p>
          <p className="text-sm text-slate-500">
            {totals.calories} kcal · P {totals.protein} · C {totals.carbs} · F {totals.fat}
          </p>
        </div>
        <button type="button" onClick={onAdd} className="button-secondary text-sm">
          Add food
        </button>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          title={`Nothing logged for ${mealLabels[meal].toLowerCase()}`}
          description="Add a food, favorite, or custom meal in one tap."
        />
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const entryTotals = getLogEntryNutrition(entry)
            return (
              <div
                key={entry.id}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{entry.item.name}</p>
                    <p className="text-xs text-slate-500">
                      {entry.quantity} × {entry.item.servingSize}
                      {entry.item.brand ? ` · ${entry.item.brand}` : ''}
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <p className="text-sm font-semibold text-slate-900">{entryTotals.calories} kcal</p>
                    <p>
                      P {entryTotals.protein} · C {entryTotals.carbs} · F {entryTotals.fat}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select
                    value={entry.meal}
                    onChange={(event) => onMove(entry.id, event.target.value as MealKey)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
                  >
                    {MEAL_ORDER.map((mealKey) => (
                      <option key={mealKey} value={mealKey}>
                        Move to {mealLabels[mealKey]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => onEdit(entry)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:border-emerald-200 hover:text-emerald-700"
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(entry.id)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-rose-600 transition hover:border-rose-200"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
