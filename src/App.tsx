import { useState } from 'react'
import type { AppTab } from './types'
import { useStore } from './store'
import { TopBar } from './components/layout/TopBar'
import { SetupScreen } from './components/setup/SetupScreen'
import { OverviewScreen } from './components/order/OverviewScreen'
import { GuestOverview } from './components/guests/GuestOverview'

export default function App() {
  const { setupComplete, eventName } = useStore()
  const [currentTab, setCurrentTab] = useState<AppTab>(setupComplete ? 'order' : 'setup')

  return (
    <div className="flex flex-col h-full bg-white">
      <TopBar currentTab={currentTab} onTabChange={setCurrentTab} eventName={eventName} />
      <div className="flex-1 overflow-hidden">
        {currentTab === 'setup' && <SetupScreen onDone={() => setCurrentTab('order')} />}
        {currentTab === 'order' && <OverviewScreen />}
        {currentTab === 'guests' && <GuestOverview />}
      </div>
    </div>
  )
}
