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

  return (
    <div className="bg-white border-b border-gray-200 shrink-0">
      {/* Top row: event name + KoHost wordmark + logo — always visible */}
      <div className="flex items-center justify-between px-5 h-14 gap-3">
        <span className="text-gray-900 font-bold text-base flex-1 min-w-0 truncate">
          {eventName}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-amber-600 font-black text-lg tracking-tight">KoHost</span>
          <img
            src="/koho-logo.jpeg"
            alt="KoHost logo"
            className="h-9 w-9 rounded-md object-cover shrink-0"
          />
        </div>
      </div>

      {/* Tabs row — horizontal scroll when narrower than the pill */}
      <div className="px-3 pb-2 pt-0.5 overflow-x-auto">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mx-auto">
          {tabs.map(({ id, label, icon: Icon }) => {
            const isActive = currentTab === id
            return (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
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
      </div>
    </div>
  )
}
