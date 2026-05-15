import { useEffect, useRef, useState } from 'react'
import { Upload, FileJson, FileText, ChevronDown, Package, Plus, Download } from 'lucide-react'
import { useStore } from '../../store'
import { MenuEditor } from './MenuEditor'
import { GuestEditor } from './GuestEditor'
import { exportMenuJSON, importMenuJSON } from '../../utils/menuExport'
import { exportAllCSV, exportGuestListCSV } from '../../utils/csvExport'
import { parseGuestImport } from '../../utils/guestImport'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { exportEventJSON, importEventJSON } from '../../utils/eventStorage'
import { restoreFromCloud, testCloudBackup } from '../../utils/autoBackup'
import { SessionSettings } from './SessionSettings'
import { EventModePicker } from './EventModePicker'

interface SetupScreenProps {
  onDone: () => void
}

export function SetupScreen({ onDone: _onDone }: SetupScreenProps) {
  const { eventName, setEventName, categories, guests, orders, payments, visitors, entryFeeConfig, setupComplete, setSetupComplete, loadEvent, startNewEvent, cloudBackupUrl, cloudBackupSecret, setCloudBackupUrl, setCloudBackupSecret, eventMode } = useStore()
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(eventName)

  // Reset section
  const [startOpen, setStartOpen] = useState(false)
  const [confirmNew, setConfirmNew] = useState(false)
  const startRef = useRef<HTMLDivElement>(null)
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
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [importOpen, exportOpen, startOpen])

  function handleSaveName() {
    if (nameInput.trim()) setEventName(nameInput.trim())
    setEditingName(false)
  }

  // --- Event actions ---
  function handleExportEventJSON() {
    exportEventJSON({ eventName, eventMode, categories, guests, orders, payments, visitors, entryFeeConfig })
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
        {/* ============ RESET SECTION ============ */}
        <div className="border-b border-gray-200 px-6 py-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Reset</h3>

          <div className="flex items-center gap-2">
            {/* Start Event dropdown */}
            <div className="relative" ref={startRef}>
              <button
                onClick={() => setStartOpen(!startOpen)}
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
          </div>
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
                type="password"
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

        {/* ============ EVENT MODE PICKER ============ */}
        {setupComplete && <EventModePicker />}

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
                  <button onClick={() => { handleExportEventJSON(); setExportOpen(false) }} className={dropdownItemClass + ' font-semibold'}>
                    <Download size={16} className="text-green-700" />
                    Event JSON (full backup)
                  </button>
                  <div className="border-t border-gray-100" />
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
                  <button onClick={() => { handleExportAll(); setExportOpen(false) }} className={dropdownItemClass}>
                    <Package size={16} className="text-green-700" />
                    Menu + Orders + Guests
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Mode-specific editors */}
          {eventMode === 'brunch' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6">
              <MenuEditor />
              <GuestEditor />
            </div>
          )}
          {eventMode === 'session' && (
            <div className="pb-6">
              <SessionSettings />
            </div>
          )}
          {!eventMode && (
            <div className="text-sm text-gray-500 pb-6">
              Pick an event mode above to configure the event.
            </div>
          )}
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

      {confirmNew && (
        <ConfirmDialog
          title="New Event"
          message="Start a fresh event? This clears everything (menu, guests, orders, visitors). If you want to keep the current event, export it as JSON first (Setup → Current Event → Export → Event JSON)."
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
