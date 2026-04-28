import type { ReactNode } from 'react'
import { useStore } from '../../store'

interface ModeEmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  buttonLabel?: string
  accent?: 'amber' | 'green' | 'gray'
}

export function ModeEmptyState({
  icon,
  title,
  description,
  buttonLabel = 'Open Setup',
  accent = 'gray',
}: ModeEmptyStateProps) {
  const setRequestedTab = useStore((s) => s.setRequestedTab)

  const buttonClass =
    accent === 'amber'
      ? 'bg-amber-600 hover:bg-amber-500 text-white'
      : accent === 'green'
        ? 'bg-green-600 hover:bg-green-500 text-white'
        : 'bg-gray-800 hover:bg-gray-700 text-white'

  return (
    <div className="h-full flex items-center justify-center px-6 bg-white">
      <div className="text-center max-w-sm">
        <div className="mx-auto mb-4 text-gray-300 flex items-center justify-center">{icon}</div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-sm text-gray-500 mb-6">{description}</p>
        <button
          onClick={() => setRequestedTab('setup')}
          className={`inline-flex items-center justify-center font-semibold rounded-xl px-6 py-3 active:scale-[0.99] transition min-h-[48px] ${buttonClass}`}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  )
}
