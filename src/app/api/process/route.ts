import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { processVideo } from '@/lib/videoProcessing'

export async function POST(request: Request) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const body = await request.json()
    const { videoId } = body

    if (!videoId) {
      console.error('[PROCESS_ERROR] Missing videoId in request body:', body)
      return new NextResponse('Video ID is required', { status: 400 })
    }

    console.log('[PROCESS_START] Processing video:', videoId)

    // Start processing in the background
    processVideo(videoId)
      .then(result => {
        console.log('[PROCESS_COMPLETE] Video processed:', videoId, result)
      })
      .catch(error => {
        console.error('[PROCESS_ERROR] Background processing failed:', error)
      })

    return NextResponse.json({ success: true, message: 'Processing started' })
  } catch (error) {
    console.error('[PROCESS_ERROR] Request handling failed:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 