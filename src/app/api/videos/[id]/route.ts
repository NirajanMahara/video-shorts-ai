import { auth } from '@clerk/nextjs'
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { deleteFromS3 } from '@/lib/storage'

const prisma = new PrismaClient()

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Get the video and its shorts
    const video = await prisma.video.findUnique({
      where: {
        id: params.id,
        userId, // Ensure the video belongs to the user
      },
      include: {
        shorts: true,
      },
    })

    if (!video) {
      return new NextResponse('Video not found', { status: 404 })
    }

    // Delete all shorts from S3 and database
    for (const short of video.shorts) {
      if (short.url) {
        try {
          await deleteFromS3(short.url)
        } catch (error) {
          console.error(`Failed to delete short from S3: ${error}`)
        }
      }
      if (short.thumbnailUrl) {
        try {
          await deleteFromS3(short.thumbnailUrl)
        } catch (error) {
          console.error(`Failed to delete thumbnail from S3: ${error}`)
        }
      }
    }

    // Delete video from S3
    if (video.url) {
      try {
        await deleteFromS3(video.url)
      } catch (error) {
        console.error(`Failed to delete video from S3: ${error}`)
      }
    }
    if (video.thumbnailUrl) {
      try {
        await deleteFromS3(video.thumbnailUrl)
      } catch (error) {
        console.error(`Failed to delete thumbnail from S3: ${error}`)
      }
    }

    // Delete video and all related shorts from database
    await prisma.video.delete({
      where: {
        id: params.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE_VIDEO_ERROR]', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 