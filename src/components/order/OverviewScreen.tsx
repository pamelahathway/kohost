import { CurrentOrderStrip } from './CurrentOrderStrip'
import { DrinkGrid } from './DrinkGrid'

export function OverviewScreen() {
  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      <CurrentOrderStrip />
      <DrinkGrid />
    </div>
  )
}
