import * as cheerio from 'cheerio'
import TurndownService from 'turndown'
import { createHash } from 'node:crypto'

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  emDelimiter: '*',
})

const ISO_TIMESTAMP_RE = /\b\d{4}-\d{2}-\d{2}T[\d:.Z+-]+\b/g
const TRACKING_PARAMS_RE = /[?&](?:utm_[^&\s)]+|ref_[^&\s)]+)/g
const MIN_CONTENT_LENGTH = 50

export type ExtractResult = {
  extractedText: string
  contentHash: string
}

export function extractContent(html: string): ExtractResult {
  const $ = cheerio.load(html)
  const bodyHtml = $('body').html() ?? ''

  if (!bodyHtml.trim()) {
    return { extractedText: '', contentHash: '' }
  }

  let markdown = turndown.turndown(bodyHtml)

  // Normalize: strip volatile tokens so diffs reflect content changes.
  markdown = markdown
    .replace(ISO_TIMESTAMP_RE, '')
    .replace(TRACKING_PARAMS_RE, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (markdown.length < MIN_CONTENT_LENGTH) {
    return { extractedText: '', contentHash: '' }
  }

  const contentHash = createHash('sha256').update(markdown).digest('hex')

  return { extractedText: markdown, contentHash }
}
