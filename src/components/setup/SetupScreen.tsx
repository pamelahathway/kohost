import { useRef, useState } from 'react'
import { Upload, FileJson, FileText, Flag, Trash2, Users } from 'lucide-react'
import { useStore } from '../../store'
import { MenuEditor } from './MenuEditor'
import { GuestEditor } from './GuestEditor'
import { exportMenuJSON, importMenuJSON } from '../../utils/menuExport'
import { exportAllCSV, exportGuestListCSV } from '../../utils/csvExport'
import { parseGuestImport } from '../../utils/guestImport'
import { ConfirmDialog } from '../shared/ConfirmDialog'

interface SetupScreenProps {
  onDone: () => void
}

export function SetupScreen({ onDone }: SetupScreenProps) {
  const { eventName, setEventName, setSetupComplete, categories, guests, orders, payments, resetEvent } = useStore()
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(eventName)
  const [showImportConfirm, setShowImportConfirm] = useState(false)
  const [showGuestImportConfirm, setShowGuestImportConfirm] = useState(false)
  const [showFinishConfirm, setShowFinishConfirm] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [pendingMenuImport, setPendingMenuImport] = useState<ReturnType<typeof importMenuJSON> | null>(null)
  const [pendingGuestImport, setPendingGuestImport] = useState<string[] | null>(null)
  const menuImportRef = useRef<HTMLInputElement>(null)
  const guestImportRef = useRef<HTMLInputElement>(null)

  function handleSaveName() {
    if (nameInput.trim()) setEventName(nameInput.trim())
    setEditingName(false)
  }

  function handleFinishEvent() {
    exportMenuJSON(categories)
    setTimeout(() => exportAllCSV(guests, orders, categories, payments, eventName), 400)
    setTimeout(() => exportGuestListCSV(guests, orders, categories, payments, eventName), 800)
    setSetupComplete(true)
    setShowFinishConfirm(false)
    onDone()
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

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Single scrollable page */}
      <div className="flex-1 overflow-y-auto">
        {/* 1. Event name — tap to rename */}
        <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
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
              <button onClick={() => setEditingName(true)} className="text-xl font-bold text-gray-900 hover:text-green-600 transition-colors">
                {eventName}
              </button>
            )}
            <span className="text-gray-400 text-sm">(tap to rename)</span>
          </div>
        </div>

        {/* 2. Action button sections */}
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col gap-4">

          {/* Start Event section */}
          <div>
            <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Start Event</h4>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => menuImportRef.current?.click()} className={btnClass}>
                <Upload size={14} className="text-green-600" />
                Import Menu (JSON)
              </button>
              <button onClick={() => guestImportRef.current?.click()} className={btnClass}>
                <Users size={14} className="text-green-600" />
                Import Guests
              </button>
            </div>
          </div>

          {/* Finish Event section */}
          <div>
            <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Finish Event</h4>
            <div className="flex flex-wrap gap-2">
              <button onClick={handleExportMenu} className={btnClass}>
                <FileJson size={14} className="text-green-600" />
                Export Menu (JSON)
              </button>
              <button onClick={handleExportOrdersAndPayments} className={btnClass}>
                <FileText size={14} className="text-green-600" />
                Export Orders & Payments (CSV)
              </button>
              <button onClick={handleExportGuestList} className={btnClass}>
                <FileText size={14} className="text-green-600" />
                Export Guest List (CSV)
              </button>
              <button
                onClick={() => setShowFinishConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-green-200 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 hover:border-green-300 transition-colors"
              >
                <Flag size={14} />
                Finish Event
              </button>
            </div>
          </div>

          {/* Danger Zone section */}
          <div className="rounded-lg border border-red-200 bg-red-50/30 px-3 py-3">
            <h4 className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-2">Danger Zone</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowResetConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-xs font-medium text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors"
              >
                <Trash2 size={14} />
                Reset Event
              </button>
            </div>
          </div>
        </div>

        {/* Hidden file inputs */}
        <input ref={menuImportRef} type="file" accept=".json" className="hidden" onChange={handleMenuFileChange} />
        <input ref={guestImportRef} type="file" accept=".json,.csv,.txt" className="hidden" onChange={handleGuestFileChange} />

        {/* 3. Two-column editors: Menu + Guests (scroll together in the same parent) */}
        <div className="px-6 py-6 grid grid-cols-1 md:grid-cols-2 gap-6">
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

      {showFinishConfirm && (
        <ConfirmDialog
          title="Finish Event"
          message={`This will download your menu and all orders & payments as files. Nothing will be deleted — your data stays safe in the app.`}
          confirmLabel="Download & Finish"
          variant="success"
          onConfirm={handleFinishEvent}
          onCancel={() => setShowFinishConfirm(false)}
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
