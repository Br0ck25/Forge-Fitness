import type { ReactNode } from 'react'

interface SectionCardProps {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}

export function SectionCard({
  title,
  description,
  action,
  children,
}: SectionCardProps) {
  return (
    <section className="section-card">
      <div className="section-head">
        <div className="section-copy">
          <h2 className="section-title">{title}</h2>
          {description ? <p className="section-description">{description}</p> : null}
        </div>

        {action ? <div>{action}</div> : null}
      </div>

      <div className="section-body">{children}</div>
    </section>
  )
}