import { X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'

interface ModalProps {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  size?: 'md' | 'lg'
  dismissible?: boolean
}

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  size = 'md',
  dismissible = true,
}: ModalProps) {
  useEffect(() => {
    if (!open) {
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (dismissible && event.key === 'Escape') {
        onClose()
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [dismissible, onClose, open])

  if (!open) {
    return null
  }

  return (
    <div
      className="modal-backdrop"
      onClick={() => {
        if (dismissible) {
          onClose()
        }
      }}
    >
      <div
        className={`modal-panel ${size === 'lg' ? 'modal-lg' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="forge-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div className="section-copy">
            <h2 id="forge-modal-title" className="modal-title">
              {title}
            </h2>
            {description ? <p className="section-description">{description}</p> : null}
          </div>

          {dismissible ? (
            <button
              type="button"
              className="button button-ghost"
              aria-label="Close dialog"
              onClick={onClose}
            >
              <X size={18} />
            </button>
          ) : null}
        </div>

        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}