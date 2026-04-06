import type { ReactNode } from 'react'

interface PageHeaderProps {
  kicker: string
  title: string
  description: string
  actions?: ReactNode
}

export function PageHeader({
  kicker,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <section className="page-header">
      <div className="page-copy">
        <p className="page-kicker">{kicker}</p>
        <h1 className="page-title">{title}</h1>
        <p className="page-description">{description}</p>
      </div>

      {actions ? <div className="page-actions">{actions}</div> : null}
    </section>
  )
}