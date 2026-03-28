import { useState, useRef } from 'react'
import { Download, Trash2, Upload, FolderOpen, Plus, Save } from 'lucide-react'
import { Modal } from '../shared/Modal'
import { Button } from '../shared/Button'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { useStore } from '../../store'
import {
  listSavedEvents,
  loadSavedEvent,
  deleteSavedEvent,
  exportEventJSON,
  importEventJSON,
  type SavedEventMeta,
} from '../../utils/eventStorage'

interface EventManagerProps {
  onClose: () => void
  onNewEvent: () => void
}

export function EventManager({ onClose, onNewEvent }: EventManagerProps) {
  const { saveCurrentEvent, loadEvent, eventName, categories, guests, orders, payments } = useStore()
  const [events, setEvents] = useState<SavedEventMeta[]>(listSavedEvents)
  const [confirmLoad, setConfirmLoad] = useState<SavedEventMeta | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<SavedEventMeta | null>(null)
  const [confirmNew, setConfirmNew] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const importRef = useRef<HTMLInputElement>(null)

  function handleSave() {
    saveCurrentEvent()
    setEvents(listSavedEvents())
    setSaveMessage('Saved!')
    setTimeout(() => setSaveMessage(''), 2000)
  }

  function handleLoad(meta: SavedEventMeta) {
    const data = loadSavedEvent(meta.id)
    if (!data) {
      alert('Could not load event — data may be corrupted.')
      return
    }
    loadEvent(data)
    setConfirmLoad(null)
    onClose()
  }

  function handleDelete(meta: SavedEventMeta) {
    deleteSavedEvent(meta.id)
    setEvents(listSavedEvents())
    setConfirmDelete(null)
  }

  function handleExport(meta: SavedEventMeta) {
    const data = loadSavedEvent(meta.id)
    if (data) exportEventJSON(data)
  }

  function handleExportCurrent() {
    exportEventJSON({ eventName, categories, guests, orders, payments })
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const data = importEventJSON(text)
      if (data) {
        loadEvent(data)
        onClose()
      } else {
        alert('Invalid event file. Please use a valid KoHost event JSON.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleNewEvent() {
    setConfirmNew(false)
    onNewEvent()
    onClose()
  }

  return (
    <Modal title="Events" onClose={onClose} wide footer={
      <div className="flex gap-2 w-full">
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </div>
    }>
      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mb-5">
        <Button variant="success" onClick={handleSave} className="flex items-center gap-1.5">
          <Save size={15} />
          {saveMessage || 'Save Current Event'}
        </Button>
        <Button variant="secondary" onClick={handleExportCurrent} className="flex items-center gap-1.5">
          <Download size={15} />
          Export Current as JSON
        </Button>
        <Button variant="secondary" onClick={() => importRef.current?.click()} className="flex items-center gap-1.5">
          <Upload size={15} />
          Import Event JSON
        </Button>
        <Button variant="secondary" onClick={() => setConfirmNew(true)} className="flex items-center gap-1.5">
          <Plus size={15} />
          New Event
        </Button>
      </div>

      <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />

      {/* Saved events list */}
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Saved Events</h3>
      {events.length === 0 ? (
        <p className="text-gray-400 text-sm">No saved events yet. Save your current event to see it here.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {events.map((meta) => (
            <div
              key={meta.id}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">{meta.name}</div>
                <div className="text-xs text-gray-400">
                  {meta.guestCount} guest{meta.guestCount !== 1 ? 's' : ''} · {new Date(meta.savedAt).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={() => setConfirmLoad(meta)}
                className="p-2 rounded-lg text-gray-400 hover:text-green-700 hover:bg-green-50 transition-colors"
                title="Load event"
              >
                <FolderOpen size={16} />
              </button>
              <button
                onClick={() => handleExport(meta)}
                className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                title="Export as JSON"
              >
                <Download size={16} />
              </button>
              <button
                onClick={() => setConfirmDelete(meta)}
                className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {confirmLoad && (
        <ConfirmDialog
          title="Load Event"
          message={`Load "${confirmLoad.name}"? This will replace your current event data. Make sure to save first if you want to keep it.`}
          confirmLabel="Load Event"
          variant="success"
          onConfirm={() => handleLoad(confirmLoad)}
          onCancel={() => setConfirmLoad(null)}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete Saved Event"
          message={`Permanently delete "${confirmDelete.name}" from saved events? This cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {confirmNew && (
        <ConfirmDialog
          title="New Event"
          message="Start a fresh event? This will clear everything (menu, guests, orders). Make sure to save your current event first if you want to keep it."
          confirmLabel="Start New Event"
          variant="danger"
          onConfirm={handleNewEvent}
          onCancel={() => setConfirmNew(false)}
        />
      )}
    </Modal>
  )
}
