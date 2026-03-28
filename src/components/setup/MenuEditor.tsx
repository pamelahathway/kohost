import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp, Edit2, Check, X } from 'lucide-react'
import { useStore } from '../../store'
import type { DrinkCategory, Drink } from '../../types'
import { IconPicker, renderIcon } from './IconPicker'
import { formatPrice, parsePriceInput } from '../../utils/formatPrice'
import { Button } from '../shared/Button'

export function MenuEditor() {
  const { categories, addCategory, updateCategory, removeCategory, addDrink, updateDrink, removeDrink } = useStore()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [newCatName, setNewCatName] = useState('')
  const [newCatIcon, setNewCatIcon] = useState('Coffee')
  const [showNewCat, setShowNewCat] = useState(false)

  const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder)

  function handleAddCategory() {
    if (!newCatName.trim()) return
    addCategory(newCatName.trim(), newCatIcon)
    setNewCatName('')
    setNewCatIcon('Coffee')
    setShowNewCat(false)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Drink Categories</h3>
        <Button size="sm" onClick={() => setShowNewCat(true)}>
          <Plus size={14} className="mr-1" /> Add Category
        </Button>
      </div>

      {showNewCat && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
          <input
            autoFocus
            className="bg-white text-gray-900 rounded-lg px-3 py-2 text-sm outline-none border border-gray-300 focus:border-green-500"
            placeholder="Category name (e.g. Hot Drinks)"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); if (e.key === 'Escape') setShowNewCat(false) }}
          />
          <IconPicker value={newCatIcon} onChange={setNewCatIcon} />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setShowNewCat(false)}>Cancel</Button>
            <Button size="sm" onClick={handleAddCategory}>Save</Button>
          </div>
        </div>
      )}

      {sorted.length === 0 && !showNewCat && (
        <p className="text-gray-400 text-sm text-center py-4">No categories yet. Add one to get started.</p>
      )}

      {sorted.map((cat) => (
        <CategoryRow
          key={cat.id}
          category={cat}
          expanded={expandedId === cat.id}
          editing={editingCatId === cat.id}
          onToggle={() => setExpandedId(expandedId === cat.id ? null : cat.id)}
          onStartEdit={() => setEditingCatId(cat.id)}
          onStopEdit={() => setEditingCatId(null)}
          onUpdate={(name, icon) => { updateCategory(cat.id, { name, icon }); setEditingCatId(null) }}
          onRemove={() => removeCategory(cat.id)}
          onAddDrink={(name, price) => addDrink(cat.id, name, price)}
          onUpdateDrink={updateDrink}
          onRemoveDrink={removeDrink}
        />
      ))}
    </div>
  )
}

interface CategoryRowProps {
  category: DrinkCategory
  expanded: boolean
  editing: boolean
  onToggle: () => void
  onStartEdit: () => void
  onStopEdit: () => void
  onUpdate: (name: string, icon: string) => void
  onRemove: () => void
  onAddDrink: (name: string, price: number) => void
  onUpdateDrink: (id: string, updates: Partial<Pick<Drink, 'name' | 'price'>>) => void
  onRemoveDrink: (id: string) => void
}

function CategoryRow({ category, expanded, editing, onToggle, onStartEdit, onStopEdit, onUpdate, onRemove, onAddDrink, onUpdateDrink, onRemoveDrink }: CategoryRowProps) {
  const [editName, setEditName] = useState(category.name)
  const [editIcon, setEditIcon] = useState(category.icon)
  const [showNewDrink, setShowNewDrink] = useState(false)
  const [newDrinkName, setNewDrinkName] = useState('')
  const [newDrinkPrice, setNewDrinkPrice] = useState('')

  function handleSave() {
    if (editName.trim()) onUpdate(editName.trim(), editIcon)
  }

  function handleAddDrink() {
    if (!newDrinkName.trim()) return
    onAddDrink(newDrinkName.trim(), parsePriceInput(newDrinkPrice))
    setNewDrinkName('')
    setNewDrinkPrice('')
    setShowNewDrink(false)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      {editing ? (
        <div className="p-4 flex flex-col gap-3">
          <input
            autoFocus
            className="bg-white text-gray-900 rounded-lg px-3 py-2 text-sm outline-none border border-gray-300 focus:border-green-500"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onStopEdit() }}
          />
          <IconPicker value={editIcon} onChange={setEditIcon} />
          <div className="flex gap-2 justify-end">
            <button onClick={onStopEdit} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
            <button onClick={handleSave} className="p-2 rounded-lg hover:bg-gray-100 text-green-600"><Check size={16} /></button>
          </div>
        </div>
      ) : (
        <div className="flex items-center px-4 py-3 gap-3">
          <button onClick={onToggle} className="flex items-center gap-3 flex-1 text-left">
            <span className="text-green-600">{renderIcon(category.icon, 20)}</span>
            <span className="font-medium text-gray-900">{category.name}</span>
            <span className="text-gray-400 text-sm">({category.drinks.length} drinks)</span>
          </button>
          <button onClick={onStartEdit} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"><Edit2 size={15} /></button>
          <button onClick={onRemove} className="p-2 rounded-lg hover:bg-gray-100 text-red-400"><Trash2 size={15} /></button>
          <button onClick={onToggle} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      )}

      {expanded && !editing && (
        <div className="border-t border-gray-200 px-4 py-3 flex flex-col gap-2 bg-gray-50">
          {category.drinks.map((drink) => (
            <DrinkRow key={drink.id} drink={drink} onUpdate={onUpdateDrink} onRemove={onRemoveDrink} />
          ))}
          {showNewDrink ? (
            <div className="mt-1">
              <div className="flex gap-2 items-center">
                <input
                  autoFocus
                  className="flex-1 min-w-0 bg-white text-gray-900 rounded-lg px-3 py-2 text-sm outline-none border border-gray-300 focus:border-green-500"
                  placeholder="Drink name"
                  value={newDrinkName}
                  onChange={(e) => setNewDrinkName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddDrink() }}
                />
                <div className="relative shrink-0">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                  <input
                    className="w-20 bg-white text-gray-900 rounded-lg pl-6 pr-2 py-2 text-sm outline-none border border-gray-300 focus:border-green-500"
                    placeholder="0.00"
                    inputMode="decimal"
                    value={newDrinkPrice}
                    onChange={(e) => setNewDrinkPrice(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleAddDrink() }}
                  />
                </div>
                <button onClick={() => setShowNewDrink(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 shrink-0"><X size={16} /></button>
                <button onClick={handleAddDrink} className="p-2 rounded-lg hover:bg-gray-100 text-green-600 shrink-0"><Check size={16} /></button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNewDrink(true)}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-green-600 py-1 transition-colors"
            >
              <Plus size={14} /> Add drink
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function DrinkRow({ drink, onUpdate, onRemove }: { drink: Drink; onUpdate: (id: string, u: Partial<Pick<Drink, 'name' | 'price'>>) => void; onRemove: (id: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(drink.name)
  const [price, setPrice] = useState((drink.price / 100).toFixed(2))

  function handleSave() {
    onUpdate(drink.id, { name: name.trim(), price: parsePriceInput(price) })
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex gap-2 items-center">
        <input autoFocus className="flex-1 bg-white text-gray-900 rounded-lg px-3 py-1.5 text-sm outline-none border border-gray-300 focus:border-green-500" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }} />
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
          <input className="w-24 bg-white text-gray-900 rounded-lg pl-6 pr-3 py-1.5 text-sm outline-none border border-gray-300 focus:border-green-500" value={price} onChange={(e) => setPrice(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }} />
        </div>
        <button onClick={() => setEditing(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={14} /></button>
        <button onClick={handleSave} className="p-1.5 rounded-lg hover:bg-gray-100 text-green-600"><Check size={14} /></button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className="flex-1 text-sm text-gray-800">{drink.name}</span>
      <span className="text-sm text-gray-500 w-16 text-right">{formatPrice(drink.price)}</span>
      <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"><Edit2 size={13} /></button>
      <button onClick={() => onRemove(drink.id)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>
    </div>
  )
}
