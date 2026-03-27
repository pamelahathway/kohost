import { useRef, useState } from 'react'
import { Upload, Download, FileJson, FileText, Flag, Trash2 } from 'lucide-react'
import { useStore } from '../../store'
import { MenuEditor } from './MenuEditor'
import { GuestEditor } from './GuestEditor'
import { Button } from '../shared/Button'
import { exportMenuJSON, importMenuJSON } from '../../utils/menuExport'
import { exportAllCSV, exportGuestListCSV } from '../../utils/csvExport'
import { ConfirmDialog } from '../shared/ConfirmDialog'

interface SetupScreenProps {
  onDone: () => void
}

export function SetupScreen({ onDone }: SetupScreenProps) {
  const { eventName, setEventName, setSetupComplete, categories, guests, orders, payments, resetEvent } = useStore()
  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(eventName)
  const [showImportConfirm, setShowImportConfirm] = useState(false)
  const [showFinishConfirm, setShowFinishConfirm] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [pendingMenuImport, setPendingMenuImport] = useState<ReturnType<typeof importMenuJSON> | null>(null)
  const menuImportRef = useRef<HTMLInputElement>(null)

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
    // reset so same file can be re-selected
    e.target.value = ''
  }

  function handleConfirmImport() {
    if (!pendingMenuImport) return
    const { replaceMenu } = useStore.getState()
    replaceMenu(pendingMenuImport)
    setPendingMenuImport(null)
    setShowImportConfirm(false)
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 shrink-0 bg-gray-50">
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

      {/* Two-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Menu */}
        <div className="flex-1 overflow-y-auto p-6 border-r border-gray-200">
          <MenuEditor />
        </div>

        {/* Right: Guests + actions */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          <GuestEditor />

          {/* Export / Import section */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Data</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => menuImportRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                <FileJson size={16} className="text-green-600" />
                Import Menu
                <Upload size={14} className="ml-auto text-gray-400" />
              </button>

              <button
                onClick={handleExportMenu}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                <FileJson size={16} className="text-green-600" />
                Export Menu
                <Download size={14} className="ml-auto text-gray-400" />
              </button>

              <button
                onClick={handleExportOrdersAndPayments}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                <FileText size={16} className="text-green-600" />
                Export Orders & Payments
                <Download size={14} className="ml-auto text-gray-400" />
              </button>

              <button
                onClick={handleExportGuestList}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                <FileText size={16} className="text-green-600" />
                Export Guest List
                <Download size={14} className="ml-auto text-gray-400" />
              </button>
            </div>

            <input
              ref={menuImportRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleMenuFileChange}
            />
          </div>

          {/* Finish / Reset */}
          <div className="mt-auto pt-4 border-t border-gray-200 flex flex-col gap-2">
            <Button
              variant="success"
              size="lg"
              className="w-full flex items-center justify-center gap-2"
              onClick={() => setShowFinishConfirm(true)}
            >
              <Flag size={18} /> Finish Event
            </Button>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-sm text-red-500 hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition-colors"
            >
              <Trash2 size={15} /> Reset Event
            </button>
          </div>
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
