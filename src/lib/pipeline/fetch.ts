const CHALLENGE_FINGERPRINTS = [
  'Just a moment...',
  'Checking your browser',
  'Attention Required! Cloudflare',
  'Attention Required',
]

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

export type FetchResult = {
  html: string | null
  httpStatus: number
  error?: 'fetch_error' | 'challenge_page' | 'timeout'
}

export async function fetchPage(url: string, timeoutMs = 15_000): Promise<FetchResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow',
    })

    const text = await response.text()

    if (CHALLENGE_FINGERPRINTS.some((fp) => text.includes(fp))) {
      return { html: null, httpStatus: response.status, error: 'challenge_page' }
    }

    return { html: text, httpStatus: response.status }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { html: null, httpStatus: 0, error: 'timeout' }
    }
    return { html: null, httpStatus: 0, error: 'fetch_error' }
  } finally {
    clearTimeout(timer)
  }
}
