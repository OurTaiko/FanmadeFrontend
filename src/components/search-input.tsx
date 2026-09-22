import { useEffect, useState } from 'react'
import { MagnifyingGlassIcon } from '@phosphor-icons/react'
import { Input } from '@/components/ui/input'

export function SearchInput({
  value,
  onSearch,
}: {
  value: string
  onSearch: (query: string) => void
}) {
  const [query, setQuery] = useState(value)
  const [composing, setComposing] = useState(false)

  useEffect(() => {
    setQuery(value)
  }, [value])

  useEffect(() => {
    if (composing || query === value) return
    const timer = window.setTimeout(() => onSearch(query), 400)
    return () => window.clearTimeout(timer)
  }, [query, value, composing, onSearch])

  return (
    <div className="relative min-w-0 flex-1">
      <MagnifyingGlassIcon
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        className="pl-9"
        type="search"
        aria-label="搜索谱面"
        placeholder="搜索曲名、谱师或上传者…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onCompositionStart={() => setComposing(true)}
        onCompositionEnd={(event) => {
          setQuery(event.currentTarget.value)
          setComposing(false)
        }}
      />
    </div>
  )
}
