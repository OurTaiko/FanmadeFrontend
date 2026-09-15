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

export function CategoryLabels({ ids = [] }: { ids?: string[] }) {
  const { items } = useContext(CategoryContext)
  if (ids.length === 0) return null
  const uniqueIds = [...new Set(ids)]
  return (
    <ul className="category-labels" aria-label="所属分类">
      {uniqueIds.map((id) => (
        <li key={id}>{items?.find((category) => category.id === id)?.title ?? id}</li>
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
    <fieldset className="category-picker" disabled={disabled}>
      <legend>谱面分类</legend>
      <p className="muted">可选择多个分类；未选择时归入 Variety。</p>
      {error ? (
        <div role="alert" className="category-error">
          <span>分类加载失败：{error}</span>
          <button type="button" className="button secondary small" onClick={retry}>
            重试加载分类
          </button>
        </div>
      ) : items === null ? (
        <p role="status" className="muted">
          正在加载分类…
        </p>
      ) : (
        <div className="category-options">
          {items.map((category) => (
            <label key={category.id} className="category-option">
              <input
                type="checkbox"
                checked={value.includes(category.id)}
                onChange={(e) => {
                  onChange(
                    e.target.checked
                      ? [...value, category.id].sort()
                      : value.filter((id) => id !== category.id),
                  )
                }}
              />
              <span>{category.title}</span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  )
}
