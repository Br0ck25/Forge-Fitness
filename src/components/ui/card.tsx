import type { PropsWithChildren } from 'react'
import { cn } from '../../utils/cn'

interface CardProps extends PropsWithChildren {
  className?: string
}

export function Card({ children, className }: CardProps) {
  return <div className={cn('app-card', className)}>{children}</div>
}
