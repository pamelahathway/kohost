import { useState, useEffect } from 'react'
import type { AppTab, EventMode } from './types'
import { useStore } from './store'
import { useDoorSync } from './hooks/useDoorSync'
import { TopBar } from './components/layout/TopBar'
import { UndoToast } from './components/shared/UndoToast'
import { SetupScreen } from './components/setup/SetupScreen'
import { OverviewScreen } from './components/order/OverviewScreen'
import { SessionScreen } from './components/session/SessionScreen'
import { GuestOverview } from './components/guests/GuestOverview'
import { EventDashboard } from './components/dashboard/EventDashboard'

function defaultTab(setupComplete: boolean, mode: EventMode | null): AppTab {
  if (!setupComplete || !mode) return 'setup'
  return mode === 'session' ? 'session' : 'order'
}

export default function App() {
  const { setupComplete, eventName, eventMode, navigateToGuestId, requestedTab, setRequestedTab } = useStore()
  const [currentTab, setCurrentTab] = useState<AppTab>(defaultTab(setupComplete, eventMode))
  const [guestViewKey, setGuestViewKey] = useState(0)

  // Handle cross-tab navigation requests (e.g., from GuestSummaryModal "View Full Tab")
  useEffect(() => {
    if (navigateToGuestId) {
      setCurrentTab('guests')
    }
  }, [navigateToGuestId])

  // Empty-state CTAs and other in-app links request a tab via the store
  useEffect(() => {
    if (requestedTab) {
      setCurrentTab(requestedTab)
      setRequestedTab(null)
    }
  }, [requestedTab, setRequestedTab])

  // Multi-device sync — only active when in session mode + cloud configured
  useDoorSync(currentTab)

  return (
    <div className="flex flex-col h-full bg-white">
      <TopBar
        currentTab={currentTab}
        onTabChange={(tab) => {
          if (tab === 'guests') setGuestViewKey((k) => k + 1)
          setCurrentTab(tab)
        }}
        eventName={eventName}
        eventMode={eventMode}
      />
      <div className="flex-1 overflow-hidden">
        {currentTab === 'setup' && <SetupScreen onDone={() => setCurrentTab(defaultTab(true, eventMode))} />}
        {currentTab === 'order' && <OverviewScreen />}
        {currentTab === 'session' && <SessionScreen />}
        {currentTab === 'guests' && <GuestOverview key={guestViewKey} />}
        {currentTab === 'dashboard' && <EventDashboard />}
      </div>
      <UndoToast />
    </div>
  )
}
