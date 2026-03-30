import { useState, useEffect } from 'react'
import type { AppTab } from './types'
import { useStore } from './store'
import { TopBar } from './components/layout/TopBar'
import { UndoToast } from './components/shared/UndoToast'
import { SetupScreen } from './components/setup/SetupScreen'
import { OverviewScreen } from './components/order/OverviewScreen'
import { GuestOverview } from './components/guests/GuestOverview'
import { EventDashboard } from './components/dashboard/EventDashboard'

export default function App() {
  const { setupComplete, eventName, navigateToGuestId } = useStore()
  const [currentTab, setCurrentTab] = useState<AppTab>(setupComplete ? 'order' : 'setup')
  const [guestViewKey, setGuestViewKey] = useState(0)

  // Handle cross-tab navigation requests (e.g., from GuestSummaryModal "View Full Tab")
  useEffect(() => {
    if (navigateToGuestId) {
      setCurrentTab('guests')
    }
  }, [navigateToGuestId])

  return (
    <div className="flex flex-col h-full bg-white">
      <TopBar currentTab={currentTab} onTabChange={(tab) => {
        if (tab === 'guests') setGuestViewKey((k) => k + 1)
        setCurrentTab(tab)
      }} eventName={eventName} />
      <div className="flex-1 overflow-hidden">
        {currentTab === 'setup' && <SetupScreen onDone={() => setCurrentTab('order')} />}
        {currentTab === 'order' && <OverviewScreen />}
        {currentTab === 'guests' && <GuestOverview key={guestViewKey} />}
        {currentTab === 'dashboard' && <EventDashboard />}
      </div>
      <UndoToast />
    </div>
  )
}
