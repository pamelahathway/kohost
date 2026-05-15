import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { useStore } from '../../store'
import { autoBackup } from '../../utils/autoBackup'

interface CheckInSheetProps {
  onClose: () => void
}

export function CheckInSheet({ onClose }: CheckInSheetProps) {
  const visitors = useStore((s) => s.visitors)
  const addVisitor = useStore((s) => s.addVisitor)
  const inputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')

  // Lock body scroll while sheet is open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Pop the keyboard reliably on iOS — small timeout works around mount-vs-focus race
  useEffect(() => {
    const id = setTimeout(() => inputRef.current?.focus(), 50)
    return () => clearTimeout(id)
  }, [])

  const trimmed = name.trim()
  const active = visitors.filter((v) => !v.deleted && !v.exitedAt)
  const duplicate = !!trimmed && active.some((v) => v.name.toLowerCase() === trimmed.toLowerCase())

  function handleConfirm() {
    if (!trimmed || duplicate) return
    addVisitor(trimmed)
    autoBackup()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <div className="text-xs uppercase tracking-wider text-gray-400">Check in</div>
            <h2 className="text-lg font-bold text-gray-900">New visitor</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors -mr-2"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          <label className="text-xs font-medium text-gray-500 mb-1 block">Visitor name</label>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm() }}
            placeholder="Visitor name"
            autoCorrect="off"
            autoCapitalize="words"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />
          {duplicate && (
            <div className="mt-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              "{trimmed}" is already inside. Please use a different name.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200">
          <button
            onClick={handleConfirm}
            disabled={!trimmed || duplicate}
            className="w-full px-4 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold active:scale-[0.99] transition min-h-[48px] disabled:opacity-40 disabled:pointer-events-none"
          >
            Check in
          </button>
        </div>
      </div>
    </div>
  )
}
