import { BarChart3 } from 'lucide-react'
import { useStore } from '../../store'
import { ModeEmptyState } from '../shared/ModeEmptyState'
import { BrunchDashboard } from './BrunchDashboard'
import { SessionDashboard } from './SessionDashboard'

export function EventDashboard() {
  const eventMode = useStore((s) => s.eventMode)

  if (eventMode === 'brunch') return <BrunchDashboard />
  if (eventMode === 'session') return <SessionDashboard />

  return (
    <ModeEmptyState
      icon={<BarChart3 size={40} />}
      title="No event configured"
      description="Choose an event mode in Setup to see the dashboard."
    />
  )
}
