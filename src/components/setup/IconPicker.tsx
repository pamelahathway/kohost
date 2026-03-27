import * as Icons from 'lucide-react'

const AVAILABLE_ICONS = [
  'Coffee', 'Wine', 'Beer', 'Milk', 'Droplets', 'Leaf', 'Flame',
  'Sparkles', 'Star', 'Sun', 'Moon', 'Zap', 'Apple', 'Cherry',
  'Citrus', 'Grape', 'IceCream2', 'Cookie', 'Candy', 'Sandwich',
  'Pizza', 'Salad', 'Soup', 'UtensilsCrossed', 'GlassWater',
  'Martini', 'Cocktail', 'Package', 'ShoppingBag', 'Gift',
]

interface IconPickerProps {
  value: string
  onChange: (icon: string) => void
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  return (
    <div className="grid grid-cols-8 gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl max-h-48 overflow-y-auto">
      {AVAILABLE_ICONS.map((name) => {
        const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[name]
        if (!Icon) return null
        return (
          <button
            key={name}
            type="button"
            onClick={() => onChange(name)}
            className={`p-2.5 rounded-lg flex items-center justify-center transition-colors ${
              value === name
                ? 'bg-green-600 text-white'
                : 'hover:bg-gray-200 text-gray-400 hover:text-gray-700'
            }`}
            title={name}
          >
            <Icon size={20} />
          </button>
        )
      })}
    </div>
  )
}

export function renderIcon(name: string, size = 20, className = '') {
  const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[name]
  if (!Icon) return null
  return <Icon size={size} className={className} />
}
