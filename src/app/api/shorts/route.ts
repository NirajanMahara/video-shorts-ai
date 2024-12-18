import { auth } from '@clerk/nextjs'
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: Request) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const videoId = searchParams.get('videoId')

    const shorts = await prisma.videoShort.findMany({
      where: {
        userId,
        ...(videoId ? { videoId } : {})
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ success: true, shorts })
  } catch (error) {
    console.error('[SHORTS_ERROR]', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 