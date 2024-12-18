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

    const shorts = await prisma.videoShort.findMany({
      where: {
        userId,
      },
      include: {
        video: {
          select: {
            title: true,
          },
        },
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