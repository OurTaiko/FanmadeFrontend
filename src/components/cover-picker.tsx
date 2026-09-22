import { useEffect, useId, useRef, useState } from 'react'
import { ImageIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { coverFileError } from '../cover'

export function CoverPicker({
  file,
  onChange,
  disabled = false,
}: {
  file: File | null
  onChange: (file: File | null) => void
  disabled?: boolean
}) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreview({ file, url })
    return () => URL.revokeObjectURL(url)
  }, [file])
  return (
    <div className="min-w-0 space-y-4">
      <Label htmlFor={id}>选择 JPG 或 PNG 封面</Label>
      <p id={`${id}-help`} className="text-sm leading-6 text-muted-foreground">
        可选，最大 8 MiB、1600 万像素。图片会按原比例缩小；首页会裁切展示，详情页保留完整封面。
      </p>
      <div className="flex min-h-36 items-center justify-center overflow-hidden rounded-2xl bg-[#f5f5f7] p-4 dark:bg-muted">
        {file && preview?.file === file ? (
          <img
            src={preview.url}
            alt="待上传的封面预览"
            className="max-h-52 max-w-full rounded-xl object-contain"
            onError={() => {
              setError('封面无法读取，请选择有效的 JPG 或 PNG 图片。')
              onChange(null)
              if (input.current) input.current.value = ''
            }}
            onLoad={(event) => {
              const image = event.currentTarget
              if (
                image.naturalWidth * image.naturalHeight > 16_000_000 ||
                image.naturalWidth > 8192 ||
                image.naturalHeight > 8192
              ) {
                setError('封面不能超过 1600 万像素，且单边不能超过 8192 像素。')
                onChange(null)
                if (input.current) input.current.value = ''
              }
            }}
          />
        ) : (
          <ImageIcon size={36} className="text-muted-foreground" aria-hidden="true" />
        )}
      </div>
      <Input
        ref={input}
        id={id}
        type="file"
        accept=".jpg,.png"
        disabled={disabled}
        aria-describedby={`${id}-help${error ? ` ${id}-error` : ''}`}
        aria-invalid={!!error}
        onChange={(event) => {
          const chosen = event.target.files?.[0]
          if (!chosen) return
          const message = coverFileError(chosen)
          setError(message)
          if (message) {
            onChange(null)
            event.target.value = ''
            return
          }
          onChange(chosen)
        }}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {file && (
        <div className="flex min-w-0 items-center justify-between gap-3">
          <span className="truncate text-sm text-muted-foreground" title={file.name}>
            {file.name}
          </span>
          <Button
            type="button"
            variant="ghost"
            disabled={disabled}
            onClick={() => {
              onChange(null)
              setError('')
              if (input.current) input.current.value = ''
            }}
          >
            取消选择
          </Button>
        </div>
      )}
    </div>
  )
}
