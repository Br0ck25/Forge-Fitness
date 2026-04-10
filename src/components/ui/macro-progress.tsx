interface MacroProgressProps {
  label: string
  current: number
  target: number
  accentClass: string
}

export function MacroProgress({ accentClass, current, label, target }: MacroProgressProps) {
  const progress = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-800">{label}</span>
        <span className="text-slate-500">
          {Math.round(current * 10) / 10} / {Math.round(target * 10) / 10}g
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div
          className={`h-2 rounded-full transition-all ${accentClass}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
