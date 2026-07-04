import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fetchPage } from '@/lib/pipeline/fetch'

const CHALLENGE_FINGERPRINTS = [
  'Just a moment...',
  'Checking your browser',
  'Attention Required! Cloudflare',
]

describe('fetchPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns html and status on successful fetch', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<html><body>Hello</body></html>', { status: 200 }),
    )
    const result = await fetchPage('https://example.com')
    expect(result.html).toBe('<html><body>Hello</body></html>')
    expect(result.httpStatus).toBe(200)
    expect(result.error).toBeUndefined()
  })

  it('detects challenge page from response text', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<html>Just a moment...</html>', { status: 200 }),
    )
    const result = await fetchPage('https://example.com')
    expect(result.html).toBeNull()
    expect(result.error).toBe('challenge_page')
  })

  it('returns fetch_error on network failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('fetch failed'))
    const result = await fetchPage('https://example.com')
    expect(result.html).toBeNull()
    expect(result.httpStatus).toBe(0)
    expect(result.error).toBe('fetch_error')
  })

  it('returns timeout error when request exceeds timeout', async () => {
    vi.useFakeTimers()
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_input, init) => new Promise((_, reject) => {
        const signal = (init as RequestInit)?.signal
        if (signal) {
          const onAbort = () => {
            signal.removeEventListener('abort', onAbort)
            reject(new DOMException('The operation was aborted', 'AbortError'))
          }
          signal.addEventListener('abort', onAbort)
        }
        setTimeout(() => reject(new DOMException('The operation was aborted', 'AbortError')), 20000)
      }),
    )
    const promise = fetchPage('https://example.com', 5000)
    vi.advanceTimersByTime(5000)
    const result = await promise
    expect(result.html).toBeNull()
    expect(result.error).toBe('timeout')
    vi.useRealTimers()
  })

  it('sends a realistic User-Agent header', async () => {
    let capturedRequest: Request | undefined
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      capturedRequest = input instanceof Request ? input : new Request(String(input), init)
      return new Response('<html><body>OK</body></html>', { status: 200 })
    })
    await fetchPage('https://example.com')
    const ua = capturedRequest!.headers.get('User-Agent') ?? ''
    expect(ua).toMatch(/^Mozilla\/5\.0/)
    expect(ua).toContain('Chrome')
  })
})
