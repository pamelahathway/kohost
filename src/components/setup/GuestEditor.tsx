import { useState } from 'react'
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react'
import { useStore } from '../../store'
import { Button } from '../shared/Button'

export function GuestEditor() {
  const { guests, addGuest, updateGuest, removeGuest } = useStore()
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const sorted = [...guests].sort((a, b) => a.name.localeCompare(b.name))

  function handleAdd() {
    if (!newName.trim()) return
    addGuest(newName.trim())
    setNewName('')
    setShowNew(false)
  }

  function startEdit(id: string, name: string) {
    setEditingId(id)
    setEditName(name)
  }

  function saveEdit() {
    if (editingId && editName.trim()) {
      updateGuest(editingId, editName.trim())
    }
    setEditingId(null)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Guests & Groups</h3>
        <Button size="sm" onClick={() => setShowNew(true)}>
          <Plus size={14} className="mr-1" /> Add Guest
        </Button>
      </div>

      {showNew && (
        <div className="flex gap-2 items-center">
          <input
            autoFocus
            className="flex-1 bg-white text-gray-900 rounded-lg px-3 py-2 text-sm outline-none border border-gray-300 focus:border-green-500"
            placeholder="Name or group (e.g. Smith Family, Table 5)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setShowNew(false) }}
          />
          <button onClick={() => setShowNew(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
          <button onClick={handleAdd} className="p-2 rounded-lg hover:bg-gray-100 text-green-600"><Check size={16} /></button>
        </div>
      )}

      {sorted.length === 0 && !showNew && (
        <p className="text-gray-400 text-sm text-center py-4">No guests yet. Add your first guest or group.</p>
      )}

      <div className="flex flex-col gap-1">
        {sorted.map((guest) => (
          <div key={guest.id} className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
            {editingId === guest.id ? (
              <>
                <input
                  autoFocus
                  className="flex-1 bg-white text-gray-900 rounded-lg px-3 py-1.5 text-sm outline-none border border-gray-300 focus:border-green-500"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null) }}
                />
                <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={15} /></button>
                <button onClick={saveEdit} className="p-1.5 rounded-lg hover:bg-gray-100 text-green-600"><Check size={15} /></button>
              </>
            ) : (
              <>
                <span className="flex-1 text-gray-900 text-sm font-medium">{guest.name}</span>
                <button onClick={() => startEdit(guest.id, guest.name)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><Edit2 size={15} /></button>
                <button onClick={() => removeGuest(guest.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-red-400"><Trash2 size={15} /></button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
