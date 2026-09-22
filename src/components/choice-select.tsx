import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function ChoiceSelect({
  label,
  value,
  onValueChange,
  items,
  disabled = false,
}: {
  label: string
  value: string
  onValueChange: (value: string) => void
  items: { value: string; label: string }[]
  disabled?: boolean
}) {
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) => {
        if (next !== null) onValueChange(next)
      }}
      disabled={disabled}
    >
      <SelectTrigger aria-label={label} data-value={value} className="min-w-32 max-w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value} data-value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
