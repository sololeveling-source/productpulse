import { NextRequest, NextResponse } from 'next/server'
import { runPipeline } from '@/lib/pipeline/run'

export async function POST(request: NextRequest) {
  const sourceIdParam = request.nextUrl.searchParams.get('sourceId')

  if (sourceIdParam != null) {
    const sourceId = Number(sourceIdParam)
    if (Number.isNaN(sourceId) || sourceId < 1) {
      return NextResponse.json(
        { error: 'sourceId must be a positive integer' },
        { status: 400 },
      )
    }

    const results = await runPipeline({ sourceId })
    return NextResponse.json({ results })
  }

  const results = await runPipeline()
  return NextResponse.json({ results })
}
