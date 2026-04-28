import { LayoutGrid, Users, BarChart3, Settings, DoorOpen } from 'lucide-react'
import type { AppTab, EventMode } from '../../types'

interface TopBarProps {
  currentTab: AppTab
  onTabChange: (tab: AppTab) => void
  eventName: string
  eventMode: EventMode | null
}

export function TopBar({ currentTab, onTabChange, eventName, eventMode }: TopBarProps) {
  const tabs: { id: AppTab; label: string; icon: typeof LayoutGrid }[] = [
    { id: 'setup', label: 'Setup', icon: Settings },
    { id: 'session', label: 'Session', icon: DoorOpen },
    { id: 'order', label: 'Brunch', icon: LayoutGrid },
    { id: 'guests', label: 'Guests', icon: Users },
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  ]

  // Accent reflects the active event's mode, not the current tab.
  const activeColor =
    eventMode === 'session' ? 'text-amber-600'
    : eventMode === 'brunch' ? 'text-green-700'
    : 'text-gray-700'
  const wordmarkColor =
    eventMode === 'session' ? 'text-amber-600'
    : eventMode === 'brunch' ? 'text-green-700'
    : 'text-gray-400'

  return (
    <div className="flex items-center justify-between px-5 h-14 bg-white border-b border-gray-200 shrink-0">
      {/* Event name */}
      <span className="text-gray-900 font-bold text-base w-48 truncate">{eventName}</span>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = currentTab === id
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? `bg-white ${activeColor} shadow-sm`
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          )
        })}
      </div>

      {/* KoHost wordmark — colour reflects active event mode */}
      <div className="w-48 flex justify-end">
        <span className={`${wordmarkColor} font-black text-lg tracking-tight transition-colors`}>KoHost</span>
      </div>
    </div>
  )
}
