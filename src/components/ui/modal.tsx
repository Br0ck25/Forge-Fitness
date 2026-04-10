import { X } from 'lucide-react'
import { type PropsWithChildren, useEffect } from 'react'

interface ModalProps extends PropsWithChildren {
  open: boolean
  title: string
  onClose: () => void
  footer?: React.ReactNode
}

export function Modal({ children, footer, open, onClose, title }: ModalProps) {
  useEffect(() => {
    if (!open) {
      return undefined
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-4 sm:items-center">
      <div className="max-h-[92svh] w-full max-w-lg overflow-y-auto rounded-4xl bg-white p-5 shadow-2xl ring-1 ring-black/5">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-semibold text-slate-950">{title}</p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">{children}</div>

        {footer ? <div className="mt-6">{footer}</div> : null}
      </div>
    </div>
  )
}
