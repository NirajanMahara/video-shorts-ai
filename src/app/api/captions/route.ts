import { auth } from '@clerk/nextjs'
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getCaptions } from '@/lib/captionGenerator'

const prisma = new PrismaClient()

export async function GET(request: Request) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('videoId')
    const shortId = searchParams.get('shortId')

    if (!videoId && !shortId) {
      return NextResponse.json({
        success: false,
        error: 'Either videoId or shortId is required'
      }, { status: 400 })
    }

    // Verify ownership
    if (videoId) {
      const video = await prisma.video.findUnique({
        where: { id: videoId }
      })
      if (!video || video.userId !== userId) {
        return NextResponse.json({
          success: false,
          error: 'Video not found or access denied'
        }, { status: 404 })
      }
    } else if (shortId) {
      const short = await prisma.videoShort.findUnique({
        where: { id: shortId }
      })
      if (!short || short.userId !== userId) {
        return NextResponse.json({
          success: false,
          error: 'Short not found or access denied'
        }, { status: 404 })
      }
    }

    // Get captions
    const captions = await getCaptions(videoId || undefined, shortId || undefined)

    return NextResponse.json({
      success: true,
      captions
    })
  } catch (error) {
    console.error('[CAPTIONS_ERROR]', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch captions'
    }, { status: 500 })
  }
} 