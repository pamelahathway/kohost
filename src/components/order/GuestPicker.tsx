import { useStore } from '../../store'
import { Modal } from '../shared/Modal'
import { Button } from '../shared/Button'
import { CheckCircle2 } from 'lucide-react'

interface GuestPickerProps {
  onClose: () => void
  pendingDrinkId?: string | null
}

export function GuestPicker({ onClose, pendingDrinkId }: GuestPickerProps) {
  const { guests, assignCartToGuest, addDrinkToGuest } = useStore()
  const sorted = [...guests].sort((a, b) => a.sortOrder - b.sortOrder)

  function handleSelect(guestId: string) {
    if (pendingDrinkId) {
      // Quick-add flow: add the searched drink directly to this guest
      addDrinkToGuest(guestId, pendingDrinkId)
    } else {
      assignCartToGuest(guestId)
    }
    onClose()
  }

  return (
    <Modal
      title={pendingDrinkId ? 'Add drink to which guest?' : 'Add to which guest?'}
      onClose={onClose}
    >
      <div className="flex flex-col gap-2">
        {sorted.map((guest) => (
          <button
            key={guest.id}
            onClick={() => handleSelect(guest.id)}
            className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-slate-700 hover:bg-indigo-600 transition-colors text-left group"
          >
            <span className="font-medium text-slate-100">{guest.name}</span>
            {guest.paid && (
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <CheckCircle2 size={14} /> Paid
              </span>
            )}
          </button>
        ))}
        {sorted.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-4">No guests found. Add guests in Setup first.</p>
        )}
      </div>
      <div className="mt-4">
        <Button variant="ghost" className="w-full" onClick={onClose}>Cancel</Button>
      </div>
    </Modal>
  )
}
