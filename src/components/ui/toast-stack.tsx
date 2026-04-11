import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import { cn } from '../../utils/cn'
import type { AppNotice } from '../../types/domain'

interface ToastStackProps {
  notices: AppNotice[]
  onDismiss: (id: string) => void
}

const toneStyles = {
  success: {
    container: 'border-emerald-200 bg-emerald-50 text-emerald-950',
    icon: CheckCircle2,
    iconClass: 'text-emerald-600',
  },
  error: {
    container: 'border-rose-200 bg-rose-50 text-rose-950',
    icon: TriangleAlert,
    iconClass: 'text-rose-600',
  },
  info: {
    container: 'border-sky-200 bg-sky-50 text-sky-950',
    icon: Info,
    iconClass: 'text-sky-600',
  },
} as const

export function ToastStack({ notices, onDismiss }: ToastStackProps) {
  if (notices.length === 0) {
    return null
  }

  return (
    <div className="fixed inset-x-4 bottom-28 z-50 mx-auto flex max-w-md flex-col gap-3">
      {notices.map((notice) => {
        const style = toneStyles[notice.tone]
        const Icon = style.icon

        return (
          <div
            key={notice.id}
            className={cn(
              'rounded-3xl border px-4 py-3 shadow-xl shadow-slate-950/8 backdrop-blur',
              style.container,
            )}
          >
            <div className="flex items-start gap-3">
              <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', style.iconClass)} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{notice.title}</p>
                {notice.description ? (
                  <p className="mt-1 text-sm text-current/80">{notice.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                aria-label="Dismiss notification"
                onClick={() => onDismiss(notice.id)}
                className="rounded-full p-1 text-current/60 transition hover:bg-white/60 hover:text-current"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}