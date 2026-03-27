import { useEffect, useRef } from 'react'
import { useStore } from '../../store'

export function UndoToast() {
  const undoLabel = useStore((s) => s.undoLabel)
  const undo = useStore((s) => s.undo)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!undoLabel) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      useStore.setState({ undoLabel: null, _undoSnapshot: null })
    }, 5000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [undoLabel])

  if (!undoLabel) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-gray-900 text-white rounded-xl px-5 py-3 shadow-lg">
      <span className="text-sm font-medium">{undoLabel}</span>
      <button
        onClick={() => {
          if (timerRef.current) clearTimeout(timerRef.current)
          undo()
        }}
        className="text-sm font-bold text-yellow-300 hover:text-yellow-200 transition-colors"
      >
        Undo
      </button>
    </div>
  )
}
