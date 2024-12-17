import { auth } from '@clerk/nextjs'
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

// Schema for upload request validation
const UploadRequestSchema = z.object({
  title: z.string().min(1),
  file: z.instanceof(File)
})

export async function POST(request: Request) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const formData = await request.formData()
    const title = formData.get('title') as string
    const file = formData.get('file') as File

    // Validate request data
    const validatedData = UploadRequestSchema.parse({ title, file })
    
    if (!validatedData) {
      return new NextResponse('Invalid request data', { status: 400 })
    }

    // TODO: Upload file to cloud storage (AWS S3 or similar)
    // For now, we'll store a placeholder URL
    const fileUrl = `https://storage.example.com/${userId}/${file.name}`

    // Create video record in database
    const video = await prisma.video.create({
      data: {
        title: validatedData.title,
        userId,
        url: fileUrl,
        status: 'PENDING'
      },
    })

    // Trigger video processing
    await fetch(`${request.url.split('/api/upload')[0]}/api/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ videoId: video.id }),
    })

    return NextResponse.json({
      success: true,
      video
    })
  } catch (error) {
    console.error('[UPLOAD_ERROR]', error)
    if (error instanceof z.ZodError) {
      return new NextResponse('Invalid request data', { status: 400 })
    }
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

// Handle file size limits
export const config = {
  api: {
    bodyParser: false,
    sizeLimit: '50mb'
  }
} 