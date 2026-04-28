import { LayoutGrid } from 'lucide-react'
import { useStore } from '../../store'
import { ModeEmptyState } from '../shared/ModeEmptyState'
import { CurrentOrderStrip } from './CurrentOrderStrip'
import { DrinkGrid } from './DrinkGrid'

export function OverviewScreen() {
  const eventMode = useStore((s) => s.eventMode)

  if (eventMode !== 'brunch') {
    return (
      <ModeEmptyState
        icon={<LayoutGrid size={40} />}
        title={eventMode === 'session' ? 'This event is in Session mode' : 'No brunch event configured'}
        description={
          eventMode === 'session'
            ? 'Switch to Brunch in Setup to take drink orders.'
            : 'Choose Brunch in Setup to start taking drink orders.'
        }
        accent="green"
      />
    )
  }

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      <CurrentOrderStrip />
      <DrinkGrid />
    </div>
  )
}
