import type { ReactNode } from 'react'

interface CardProps {
  label: string
  children: ReactNode
  action?: ReactNode
}

export function Card({ label, children, action }: CardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          {label}
        </div>
        {action}
      </div>
      <div className="flex flex-col">{children}</div>
    </div>
  )
}
