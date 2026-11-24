import { Check } from 'lucide-react'
import { colorName, COLORS, ICON_NAMES, ICONS } from './icons.js'

const SIZES = {
  sm: 'size-7 rounded-md [&>svg]:size-3.5',
  md: 'size-9 rounded-lg [&>svg]:size-[18px]',
  lg: 'size-11 rounded-xl [&>svg]:size-5',
}

// The soft background is mixed from the color, so any stored color works in both themes.
export function ColorIcon({ icon, color, size = 'md' }) {
  const Icon = ICONS[icon] ?? ICONS.folder
  return (
    <span
      className={`flex shrink-0 items-center justify-center ${SIZES[size]}`}
      style={{
        backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
        color: `color-mix(in srgb, ${color} 80%, var(--ink))`,
      }}
    >
      <Icon aria-hidden="true" />
    </span>
  )
}

export function ProjectBadge({ project }) {
  if (!project) return null
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-surface-2 px-1.5 py-0.5 text-xs font-medium text-ink-2">
      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: project.color }} aria-hidden="true" />
      <span className="truncate">{project.name}</span>
    </span>
  )
}

export function IconPicker({ label = 'Icon', value, color, onChange }) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-sm font-medium text-ink">{label}</legend>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-1 lg:grid-cols-[repeat(auto-fill,minmax(36px,1fr))]">
        {ICON_NAMES.map((name) => {
          const Icon = ICONS[name]
          const selected = name === value
          return (
            <label
              key={name}
              className={`flex h-11 cursor-pointer items-center justify-center rounded-lg border has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-link lg:h-9 ${
                selected ? 'border-ink bg-surface-2' : 'border-transparent hover:bg-surface-2'
              }`}
              style={selected ? { color } : undefined}
            >
              <input
                type="radio"
                name="icon"
                className="sr-only"
                checked={selected}
                onChange={() => onChange(name)}
                aria-label={name.replace(/-\d*$|-/g, ' ').trim()}
              />
              <Icon className="size-[18px]" aria-hidden="true" />
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

export function ColorPicker({ label = 'Color', value, onChange }) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1.5 text-sm font-medium text-ink">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {COLORS.map((color) => {
          const selected = color === value
          return (
            <label
              key={color}
              className="flex size-11 cursor-pointer items-center justify-center rounded-full has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-link lg:size-8"
              style={{ backgroundColor: color }}
            >
              <input
                type="radio"
                name="color"
                className="sr-only"
                checked={selected}
                onChange={() => onChange(color)}
                aria-label={colorName(color)}
              />
              {selected && <Check className="size-4 text-white" aria-hidden="true" />}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
