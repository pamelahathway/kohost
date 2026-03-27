import { LayoutGrid, Users, BarChart3, Settings } from 'lucide-react'
import type { AppTab } from '../../types'

interface TopBarProps {
  currentTab: AppTab
  onTabChange: (tab: AppTab) => void
  eventName: string
}

export function TopBar({ currentTab, onTabChange, eventName }: TopBarProps) {
  const tabs: { id: AppTab; label: string; icon: typeof LayoutGrid }[] = [
    { id: 'order', label: 'Overview', icon: LayoutGrid },
    { id: 'guests', label: 'Guests', icon: Users },
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'setup', label: 'Setup', icon: Settings },
  ]

  return (
    <div className="flex items-center justify-between px-5 h-14 bg-white border-b border-gray-200 shrink-0">
      {/* Event name */}
      <span className="text-gray-900 font-bold text-base w-48 truncate">{eventName}</span>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              currentTab === id
                ? 'bg-white text-green-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* KoHost logo/wordmark */}
      <div className="w-48 flex justify-end">
        <span className="text-green-700 font-black text-lg tracking-tight">KoHost</span>
      </div>
    </div>
  )
}
