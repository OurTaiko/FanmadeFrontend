import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from './api'
import type { Category } from './api'

const CategoryContext = createContext<{
  items: Category[] | null
  error: string
  retry: () => void
}>({ items: null, error: '', retry: () => {} })

export function CategoryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Category[] | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    api<{ items: Category[] }>('/categories', { signal: controller.signal })
      .then(({ items }) => {
        if (!controller.signal.aborted) setItems(items)
      })
      .catch((e: Error) => {
        if (!controller.signal.aborted) setError(e.message)
      })
    return () => controller.abort()
  }, [attempt])
  const retry = () => {
    setError('')
    setAttempt((n) => n + 1)
  }
  return (
    <CategoryContext.Provider value={{ items, error, retry }}>{children}</CategoryContext.Provider>
  )
}

export function CategoryLabels({ ids = [], children }: { ids?: string[]; children?: ReactNode }) {
  const { items } = useContext(CategoryContext)
  if (ids.length === 0 && !children) return null
  const uniqueIds = [...new Set(ids)]
  return (
    <ul
      className="flex min-w-0 flex-wrap items-center gap-2"
      aria-label={children ? '谱面信息' : '所属分类'}
    >
      {children}
      {uniqueIds.map((id) => (
        <li key={id}>
          <Badge variant="outline">
            {items?.find((category) => category.id === id)?.title ?? id}
          </Badge>
        </li>
      ))}
    </ul>
  )
}

export function CategoryPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
}) {
  const { items, error, retry } = useContext(CategoryContext)
  return (
    <fieldset
      className="min-w-0 space-y-3 [&>legend]:mb-2 [&>legend]:text-sm [&>legend]:font-medium"
      disabled={disabled}
    >
      <legend>谱面分类</legend>
      <p className="text-sm text-muted-foreground">可选择多个分类；未选择时归入 Variety。</p>
      {error ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-destructive">
          <span>分类加载失败：{error}</span>
          <Button type="button" variant="outline" size="sm" onClick={retry}>
            重试加载分类
          </Button>
        </div>
      ) : items === null ? (
        <p role="status" className="text-sm text-muted-foreground">
          正在加载分类…
        </p>
      ) : (
        <div className="flex flex-wrap gap-x-6 gap-y-4">
          {items.map((category) => (
            <Label key={category.id} className="inline-flex items-center gap-2 text-sm">
              <Checkbox
                disabled={disabled}
                checked={value.includes(category.id)}
                onCheckedChange={(checked) => {
                  onChange(
                    checked
                      ? [...value, category.id].sort()
                      : value.filter((id) => id !== category.id),
                  )
                }}
              />
              <span>{category.title}</span>
            </Label>
          ))}
        </div>
      )}
    </fieldset>
  )
}
