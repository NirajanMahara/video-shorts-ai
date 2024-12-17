import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { processVideo } from '@/lib/videoProcessing'

export async function POST(request: Request) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { videoId } = await request.json()

    if (!videoId) {
      return new NextResponse('Video ID is required', { status: 400 })
    }

    // Start processing in the background
    processVideo(videoId).catch(error => {
      console.error('Background processing failed:', error)
    })

    return NextResponse.json({ success: true, message: 'Processing started' })
  } catch (error) {
    console.error('[PROCESS_ERROR]', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 