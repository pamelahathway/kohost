import { useEffect, useRef, useState } from 'react'
import { Upload, FileJson, FileText, Trash2, ChevronDown, Package, FolderOpen } from 'lucide-react'
import { useStore } from '../../store'
import { MenuEditor } from './MenuEditor'
import { GuestEditor } from './GuestEditor'
import { exportMenuJSON, importMenuJSON } from '../../utils/menuExport'
import { exportAllCSV, exportGuestListCSV } from '../../utils/csvExport'
import { parseGuestImport } from '../../utils/guestImport'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { EventManager } from './EventManager'

interface SetupScreenProps {
  onDone: () => void
}

export function SetupScreen({ onDone }: SetupScreenProps) {
  const { eventName, setEventName, categories, guests, orders, payments, resetEvent, startNewEvent } = useStore()
  const [showEventManager, setShowEventManager] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(eventName)
  const [showImportConfirm, setShowImportConfirm] = useState(false)
  const [showGuestImportConfirm, setShowGuestImportConfirm] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [pendingMenuImport, setPendingMenuImport] = useState<ReturnType<typeof importMenuJSON> | null>(null)
  const [pendingGuestImport, setPendingGuestImport] = useState<string[] | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const menuImportRef = useRef<HTMLInputElement>(null)
  const guestImportRef = useRef<HTMLInputElement>(null)
  const importRef = useRef<HTMLDivElement>(null)
  const exportRef = useRef<HTMLDivElement>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (importOpen && importRef.current && !importRef.current.contains(e.target as Node)) {
        setImportOpen(false)
      }
      if (exportOpen && exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [importOpen, exportOpen])

  function handleSaveName() {
    if (nameInput.trim()) setEventName(nameInput.trim())
    setEditingName(false)
  }

  function handleExportAll() {
    exportMenuJSON(categories)
    setTimeout(() => exportAllCSV(guests, orders, categories, payments, eventName), 400)
    setTimeout(() => exportGuestListCSV(guests, orders, categories, payments, eventName), 800)
  }

  function handleExportMenu() {
    exportMenuJSON(categories)
  }

  function handleExportOrdersAndPayments() {
    exportAllCSV(guests, orders, categories, payments, eventName)
  }

  function handleExportGuestList() {
    exportGuestListCSV(guests, orders, categories, payments, eventName)
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

  const btnClass = 'flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors'
  const dropdownItemClass = 'flex items-center gap-2 w-full px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors'

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Fixed header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        {/* Event name */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center gap-3">
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
        </div>

        {/* Action buttons row */}
        <div className="px-6 pb-3 flex items-center gap-2">
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
                <button onClick={() => { handleExportMenu(); setExportOpen(false) }} className={dropdownItemClass}>
                  <FileJson size={16} className="text-green-700" />
                  Menu (JSON)
                </button>
                <button onClick={() => { handleExportOrdersAndPayments(); setExportOpen(false) }} className={dropdownItemClass}>
                  <FileText size={16} className="text-green-700" />
                  Orders & Payments (CSV)
                </button>
                <button onClick={() => { handleExportGuestList(); setExportOpen(false) }} className={dropdownItemClass}>
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

          {/* Events */}
          <button onClick={() => setShowEventManager(true)} className={btnClass}>
            <FolderOpen size={14} className="text-green-700" />
            Events
          </button>

          {/* Reset — pushed to far right */}
          <button
            onClick={() => setShowResetConfirm(true)}
            className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-xs font-medium text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors"
          >
            <Trash2 size={14} />
            Reset
          </button>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input ref={menuImportRef} type="file" accept=".json" className="hidden" onChange={handleMenuFileChange} />
      <input ref={guestImportRef} type="file" accept=".json,.csv,.txt" className="hidden" onChange={handleGuestFileChange} />

      {/* Scrollable editor area */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MenuEditor />
          <GuestEditor />
        </div>
      </div>

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

      {showEventManager && (
        <EventManager
          onClose={() => setShowEventManager(false)}
          onNewEvent={() => { startNewEvent(); setShowEventManager(false) }}
        />
      )}

      {showResetConfirm && (
        <ConfirmDialog
          title="Reset Event"
          message={`This will permanently delete all guests, orders, and payment history. The menu will be kept. This cannot be undone.`}
          confirmLabel="Yes, Delete Everything"
          variant="danger"
          onConfirm={() => { resetEvent(); setShowResetConfirm(false) }}
          onCancel={() => setShowResetConfirm(false)}
        />
      )}
    </div>
  )
}
