import { useEffect, useRef, useState } from 'react'
import { Upload, FileJson, FileText, Trash2, ChevronDown, ChevronUp, Package, Plus, Save, Download, FolderOpen } from 'lucide-react'
import { useStore } from '../../store'
import { MenuEditor } from './MenuEditor'
import { GuestEditor } from './GuestEditor'
import { exportMenuJSON, importMenuJSON } from '../../utils/menuExport'
import { exportAllCSV, exportGuestListCSV } from '../../utils/csvExport'
import { parseGuestImport } from '../../utils/guestImport'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import {
  listSavedEvents,
  loadSavedEvent,
  deleteSavedEvent,
  exportEventJSON,
  importEventJSON,
  type SavedEventMeta,
} from '../../utils/eventStorage'
import { restoreFromCloud, testCloudBackup } from '../../utils/autoBackup'

interface SetupScreenProps {
  onDone: () => void
}

export function SetupScreen({ onDone: _onDone }: SetupScreenProps) {
  const { eventName, setEventName, categories, guests, orders, payments, setupComplete, setSetupComplete, saveCurrentEvent, loadEvent, startNewEvent, cloudBackupUrl, cloudBackupSecret, setCloudBackupUrl, setCloudBackupSecret } = useStore()
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(eventName)

  // Events section
  const [eventsExpanded, setEventsExpanded] = useState(false)
  const [savedEvents, setSavedEvents] = useState<SavedEventMeta[]>(listSavedEvents)
  const [startOpen, setStartOpen] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [confirmLoad, setConfirmLoad] = useState<SavedEventMeta | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<SavedEventMeta | null>(null)
  const [confirmNew, setConfirmNew] = useState(false)
  const startRef = useRef<HTMLDivElement>(null)
  const saveRef = useRef<HTMLDivElement>(null)
  const eventImportRef = useRef<HTMLInputElement>(null)

  // Current event section
  const [showImportConfirm, setShowImportConfirm] = useState(false)
  const [showGuestImportConfirm, setShowGuestImportConfirm] = useState(false)
  const [pendingMenuImport, setPendingMenuImport] = useState<ReturnType<typeof importMenuJSON> | null>(null)
  const [pendingGuestImport, setPendingGuestImport] = useState<string[] | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const menuImportRef = useRef<HTMLInputElement>(null)
  const guestImportRef = useRef<HTMLInputElement>(null)
  const importRef = useRef<HTMLDivElement>(null)
  const exportRef = useRef<HTMLDivElement>(null)

  // Cloud backup
  const [cloudTestResult, setCloudTestResult] = useState<{ ok: boolean; error?: string } | null>(null)
  const [cloudRestoring, setCloudRestoring] = useState(false)
  const [confirmCloudRestore, setConfirmCloudRestore] = useState(false)

  // Close all dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (importOpen && importRef.current && !importRef.current.contains(e.target as Node)) setImportOpen(false)
      if (exportOpen && exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false)
      if (startOpen && startRef.current && !startRef.current.contains(e.target as Node)) setStartOpen(false)
      if (saveOpen && saveRef.current && !saveRef.current.contains(e.target as Node)) setSaveOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [importOpen, exportOpen, startOpen, saveOpen])

  function handleSaveName() {
    if (nameInput.trim()) setEventName(nameInput.trim())
    setEditingName(false)
  }

  // --- Event actions ---
  function handleSaveEvent() {
    saveCurrentEvent()
    setSavedEvents(listSavedEvents())
    setSaveMessage('Saved!')
    setTimeout(() => setSaveMessage(''), 2000)
    setSaveOpen(false)
  }

  function handleSaveAndExport() {
    saveCurrentEvent()
    setSavedEvents(listSavedEvents())
    exportEventJSON({ eventName, categories, guests, orders, payments })
    setSaveMessage('Saved & exported!')
    setTimeout(() => setSaveMessage(''), 2000)
    setSaveOpen(false)
  }

  function handleExportCurrentEvent() {
    exportEventJSON({ eventName, categories, guests, orders, payments })
    setSaveOpen(false)
  }

  function handleLoadEvent(meta: SavedEventMeta) {
    const data = loadSavedEvent(meta.id)
    if (!data) {
      alert('Could not load event — data may be corrupted.')
      return
    }
    loadEvent(data)
    setConfirmLoad(null)
    setNameInput(data.eventName)
    setSavedEvents(listSavedEvents())
  }

  function handleDeleteEvent(meta: SavedEventMeta) {
    deleteSavedEvent(meta.id)
    setSavedEvents(listSavedEvents())
    setConfirmDelete(null)
  }

  function handleExportSavedEvent(meta: SavedEventMeta) {
    const data = loadSavedEvent(meta.id)
    if (data) exportEventJSON(data)
  }

  function handleNewEvent() {
    setConfirmNew(false)
    startNewEvent()
    setSetupComplete(true)
    setNameInput('My Event')
    setStartOpen(false)
  }

  function handleEventImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const data = importEventJSON(text)
      if (data) {
        loadEvent(data)
        setNameInput(data.eventName)
      } else {
        alert('Invalid event file. Please use a valid KoHost event JSON.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
    setStartOpen(false)
  }

  // --- Current event actions ---
  function handleExportAll() {
    exportMenuJSON(categories)
    setTimeout(() => exportAllCSV(guests, orders, categories, payments, eventName), 400)
    setTimeout(() => exportGuestListCSV(guests, orders, categories, payments, eventName), 800)
  }

  function handleMenuFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const parsed = importMenuJSON(text)
      if (parsed) {
        setPendingMenuImport(parsed)
        setShowImportConfirm(true)
      } else {
        alert('Invalid menu file. Please use a valid KoHost menu JSON.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleGuestFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const parsed = parseGuestImport(text)
      if (parsed) {
        setPendingGuestImport(parsed)
        setShowGuestImportConfirm(true)
      } else {
        alert('Invalid guest file. Use a JSON array or a text file with one name per line.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleConfirmImport() {
    if (!pendingMenuImport) return
    const { replaceMenu } = useStore.getState()
    replaceMenu(pendingMenuImport)
    setPendingMenuImport(null)
    setShowImportConfirm(false)
  }

  function handleConfirmGuestImport() {
    if (!pendingGuestImport) return
    const { addGuest } = useStore.getState()
    for (const name of pendingGuestImport) {
      addGuest(name)
    }
    setPendingGuestImport(null)
    setShowGuestImportConfirm(false)
  }

  async function handleTestCloud() {
    setCloudTestResult(null)
    const result = await testCloudBackup()
    setCloudTestResult(result)
    setTimeout(() => setCloudTestResult(null), 4000)
  }

  async function handleCloudRestore() {
    setCloudRestoring(true)
    const result = await restoreFromCloud()
    setCloudRestoring(false)
    setConfirmCloudRestore(false)
    if (typeof result === 'string') {
      alert(`Restore failed: ${result}`)
    } else {
      loadEvent(result as Parameters<typeof loadEvent>[0])
      setNameInput(result.eventName)
    }
  }

  const btnClass = 'flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors'
  const dropdownItemClass = 'flex items-center gap-2 w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors'

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Hidden file inputs */}
      <input ref={menuImportRef} type="file" accept=".json" className="hidden" onChange={handleMenuFileChange} />
      <input ref={guestImportRef} type="file" accept=".json,.csv,.txt" className="hidden" onChange={handleGuestFileChange} />
      <input ref={eventImportRef} type="file" accept=".json" className="hidden" onChange={handleEventImportFile} />

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* ============ EVENTS SECTION ============ */}
        <div className="border-b border-gray-200 px-6 py-4">
          {/* Line 1: EVENTS label */}
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Events</h3>

          {/* Line 2: Start Event + Save Event dropdowns */}
          <div className="flex items-center gap-2 mb-3">
            {/* Start Event dropdown */}
            <div className="relative" ref={startRef}>
              <button
                onClick={() => { setStartOpen(!startOpen); setSaveOpen(false) }}
                className={btnClass}
              >
                <Plus size={14} className="text-green-700" />
                Start Event
                <ChevronDown size={12} className={`transition-transform ${startOpen ? 'rotate-180' : ''}`} />
              </button>
              {startOpen && (
                <div className="absolute top-full left-0 mt-1 w-52 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden z-20">
                  <button onClick={() => setConfirmNew(true)} className={dropdownItemClass}>
                    <Plus size={16} className="text-green-700" />
                    New Event
                  </button>
                  <button onClick={() => { eventImportRef.current?.click() }} className={dropdownItemClass}>
                    <Upload size={16} className="text-green-700" />
                    New from File (JSON)
                  </button>
                </div>
              )}
            </div>

            {/* Save Event dropdown — only when an event exists */}
            {setupComplete && <div className="relative" ref={saveRef}>
              <button
                onClick={() => { setSaveOpen(!saveOpen); setStartOpen(false) }}
                className={btnClass}
              >
                <Save size={14} className="text-green-700" />
                {saveMessage || 'Save Event'}
                <ChevronDown size={12} className={`transition-transform ${saveOpen ? 'rotate-180' : ''}`} />
              </button>
              {saveOpen && (
                <div className="absolute top-full left-0 mt-1 w-52 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden z-20">
                  <button onClick={handleSaveEvent} className={dropdownItemClass}>
                    <Save size={16} className="text-green-700" />
                    Save
                  </button>
                  <button onClick={handleSaveAndExport} className={dropdownItemClass}>
                    <Download size={16} className="text-green-700" />
                    Save & Export JSON
                  </button>
                  <div className="border-t border-gray-100" />
                  <button onClick={handleExportCurrentEvent} className={dropdownItemClass}>
                    <Download size={16} className="text-gray-400" />
                    Export JSON only
                  </button>
                </div>
              )}
            </div>}
          </div>

          {/* Line 3: Saved events toggle button */}
          {savedEvents.length > 0 && (
            <button
              onClick={() => setEventsExpanded(!eventsExpanded)}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <FolderOpen size={14} />
              {savedEvents.length} saved event{savedEvents.length !== 1 ? 's' : ''}
              {eventsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}

          {/* Expanded saved events list */}
          {eventsExpanded && savedEvents.length > 0 && (
            <div className="mt-3 flex flex-col gap-2">
              {savedEvents.map((meta) => (
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
                        onClick={() => handleExportSavedEvent(meta)}
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
        </div>

        {/* ============ CLOUD BACKUP SECTION ============ */}
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Cloud Backup</h3>
          <p className="text-xs text-gray-400 mb-3">
            Backups are sent automatically after every order and payment. Configure your Cloudflare Worker URL and secret below.
          </p>
          <div className="flex flex-col gap-3 max-w-lg">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Worker URL</label>
              <input
                type="url"
                placeholder="https://kohost-backup.yourname.workers.dev"
                value={cloudBackupUrl}
                onChange={(e) => setCloudBackupUrl(e.target.value.trim())}
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Secret</label>
              <input
                type="text"
                placeholder="shared secret"
                value={cloudBackupSecret}
                onChange={(e) => setCloudBackupSecret(e.target.value)}
                autoCorrect="off"
                autoCapitalize="off"
                autoComplete="off"
                spellCheck={false}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleTestCloud} className={btnClass}>
                Test Connection
              </button>
              <button
                onClick={() => setConfirmCloudRestore(true)}
                disabled={!cloudBackupUrl || !cloudBackupSecret}
                className={`${btnClass} ${!cloudBackupUrl || !cloudBackupSecret ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <Download size={14} className="text-green-700" />
                Restore from Cloud
              </button>
              {cloudTestResult && (
                <span className={`text-xs font-medium ${cloudTestResult.ok ? 'text-green-600' : 'text-red-500'}`}>
                  {cloudTestResult.ok ? 'Connected!' : cloudTestResult.error}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ============ CURRENT EVENT SECTION ============ */}
        {setupComplete && <div className="px-6 pt-4">
          {/* Section label + event name */}
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Current Event</h3>
          </div>
          <div className="flex items-center gap-3 mb-3">
            {editingName ? (
              <input
                autoFocus
                className="text-xl font-bold text-gray-900 outline-none border-b-2 border-green-500 bg-transparent"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName() }}
              />
            ) : (
              <button onClick={() => setEditingName(true)} className="text-xl font-bold text-gray-900 hover:text-green-700 transition-colors">
                {eventName}
              </button>
            )}
            <span className="text-gray-400 text-sm">(tap to rename)</span>
          </div>

          {/* Import / Export / Reset row */}
          <div className="flex items-center gap-2 mb-6">
            {/* Import dropdown */}
            <div className="relative" ref={importRef}>
              <button onClick={() => { setImportOpen(!importOpen); setExportOpen(false) }} className={btnClass}>
                <Upload size={14} className="text-green-700" />
                Import
                <ChevronDown size={12} className={`transition-transform ${importOpen ? 'rotate-180' : ''}`} />
              </button>
              {importOpen && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden z-20">
                  <button onClick={() => { menuImportRef.current?.click(); setImportOpen(false) }} className={dropdownItemClass}>
                    <FileJson size={16} className="text-green-700" />
                    Menu (JSON)
                  </button>
                  <button onClick={() => { guestImportRef.current?.click(); setImportOpen(false) }} className={dropdownItemClass}>
                    <FileText size={16} className="text-green-700" />
                    Guests
                  </button>
                </div>
              )}
            </div>

            {/* Export dropdown */}
            <div className="relative" ref={exportRef}>
              <button onClick={() => { setExportOpen(!exportOpen); setImportOpen(false) }} className={btnClass}>
                <FileJson size={14} className="text-green-700" />
                Export
                <ChevronDown size={12} className={`transition-transform ${exportOpen ? 'rotate-180' : ''}`} />
              </button>
              {exportOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg border border-gray-200 shadow-lg overflow-hidden z-20">
                  <button onClick={() => { exportMenuJSON(categories); setExportOpen(false) }} className={dropdownItemClass}>
                    <FileJson size={16} className="text-green-700" />
                    Menu (JSON)
                  </button>
                  <button onClick={() => { exportAllCSV(guests, orders, categories, payments, eventName); setExportOpen(false) }} className={dropdownItemClass}>
                    <FileText size={16} className="text-green-700" />
                    Orders & Payments (CSV)
                  </button>
                  <button onClick={() => { exportGuestListCSV(guests, orders, categories, payments, eventName); setExportOpen(false) }} className={dropdownItemClass}>
                    <FileText size={16} className="text-green-700" />
                    Guest List (CSV)
                  </button>
                  <div className="border-t border-gray-100" />
                  <button onClick={() => { handleExportAll(); setExportOpen(false) }} className={dropdownItemClass + ' font-semibold'}>
                    <Package size={16} className="text-green-700" />
                    All (Menu + Orders + Guests)
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Menu + Guest editors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
            <MenuEditor />
            <GuestEditor />
          </div>
        </div>}
      </div>

      {/* Confirm dialogs */}
      {showImportConfirm && (
        <ConfirmDialog
          title="Import Menu"
          message={`This will replace your current menu with the imported one (${pendingMenuImport?.length ?? 0} categories). Guest tabs and event data will not be affected.`}
          confirmLabel="Replace Menu"
          variant="danger"
          onConfirm={handleConfirmImport}
          onCancel={() => { setShowImportConfirm(false); setPendingMenuImport(null) }}
        />
      )}

      {showGuestImportConfirm && (
        <ConfirmDialog
          title="Import Guests"
          message={`This will add ${pendingGuestImport?.length ?? 0} guests to your event. Existing guests will not be removed.`}
          confirmLabel="Add Guests"
          variant="success"
          onConfirm={handleConfirmGuestImport}
          onCancel={() => { setShowGuestImportConfirm(false); setPendingGuestImport(null) }}
        />
      )}

      {confirmLoad && (
        <ConfirmDialog
          title="Load Event"
          message={`Load "${confirmLoad.name}"? This will replace your current event data. Make sure to save first if you want to keep it.`}
          confirmLabel="Load Event"
          variant="success"
          onConfirm={() => handleLoadEvent(confirmLoad)}
          onCancel={() => setConfirmLoad(null)}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete Saved Event"
          message={`Permanently delete "${confirmDelete.name}" from saved events? This cannot be undone.`}
          confirmLabel="Delete"
          variant="danger"
          onConfirm={() => handleDeleteEvent(confirmDelete)}
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

      {confirmCloudRestore && (
        <ConfirmDialog
          title="Restore from Cloud"
          message={cloudRestoring ? 'Restoring...' : 'This will replace your current event with the latest cloud backup. Make sure to save first if you want to keep your current data.'}
          confirmLabel={cloudRestoring ? 'Restoring...' : 'Restore'}
          variant="success"
          onConfirm={handleCloudRestore}
          onCancel={() => setConfirmCloudRestore(false)}
        />
      )}
    </div>
  )
}
