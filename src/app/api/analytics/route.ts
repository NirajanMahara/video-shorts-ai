import { auth } from '@clerk/nextjs'
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Get all videos for the user
    const videos = await prisma.video.findMany({
      where: { userId },
      include: { shorts: true },
    })

    // Calculate total storage used (assuming average video size of 10MB and short size of 2MB)
    const totalStorageGB = (
      (videos.length * 10 + 
      videos.reduce((acc, video) => acc + video.shorts.length, 0) * 2) / 1024
    ).toFixed(1)

    // Calculate success rate
    const completedVideos = videos.filter(v => v.status === 'COMPLETED')
    const successRate = videos.length > 0
      ? Math.round((completedVideos.length / videos.length) * 100)
      : 0

    // Calculate average processing time (mock data for now)
    const avgProcessingTime = '2.3'

    // Get recent activity
    const recentActivity = await prisma.video.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        status: true,
        updatedAt: true,
      },
    })

    // Calculate processing stats
    const processingStats = {
      successRate,
      processingSpeed: 88, // Mock data
      storageEfficiency: 92, // Mock data
    }

    // Calculate trends (mock data for now)
    const trends = {
      successRate: 2.5,
      totalVideos: 12,
      processingTime: -8,
      storageUsed: 15,
    }

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          successRate: `${successRate}%`,
          totalVideos: videos.length,
          processingTime: `${avgProcessingTime}m`,
          storageUsed: `${totalStorageGB} GB`,
        },
        trends,
        recentActivity,
        processingStats,
      },
    })
  } catch (error) {
    console.error('[ANALYTICS_ERROR]', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 