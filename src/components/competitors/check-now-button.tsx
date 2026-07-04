'use client'

import { useState } from 'react'
import { Loader2, Play } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

type CheckNowButtonProps = {
  sourceId?: number
  label?: string
  variant?: 'default' | 'ghost'
}

export function CheckNowButton({
  sourceId,
  label = 'Check now',
  variant = 'default',
}: CheckNowButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const params = sourceId != null ? `?sourceId=${sourceId}` : ''
      const res = await fetch(`/api/monitor${params}`, { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Check failed')
        return
      }

      const results: Array<{ status: string; url: string }> = data.results ?? []
      const ok = results.filter((r) => r.status === 'ok').length
      const errors = results.filter((r) => r.status !== 'ok').length

      if (results.length === 0) {
        toast.info('No active sources to check')
      } else if (errors === 0) {
        toast.success(`Checked ${results.length} source${results.length > 1 ? 's' : ''} — all OK`)
      } else {
        toast.success(
          `Checked ${results.length} source${results.length > 1 ? 's' : ''} — ${ok} OK, ${errors} error${errors > 1 ? 's' : ''}`,
        )
      }
    } catch {
      toast.error('Network error. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={variant === 'ghost' ? 'icon-sm' : 'default'}
      onClick={handleClick}
      disabled={loading}
      aria-label={label}
    >
      {loading ? (
        <Loader2 className="animate-spin" />
      ) : (
        <Play />
      )}
      {variant !== 'ghost' && <span>{label}</span>}
    </Button>
  )
}
