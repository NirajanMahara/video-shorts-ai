import { auth } from '@clerk/nextjs'
import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { uploadToS3, generateS3Key } from '@/lib/storage'
import { processVideo } from '@/lib/videoProcessor'

const prisma = new PrismaClient()

// Schema for processing settings validation
const ProcessingSettingsSchema = z.object({
  segmentDuration: z.number().min(5).max(60),
  enableSceneDetection: z.boolean(),
  enableCaptions: z.boolean(),
  enableFilters: z.boolean(),
  selectedFilter: z.string(),
  minSegmentLength: z.number().min(5).max(30),
  maxSegments: z.number().min(1).max(10)
})

// Schema for upload request validation
const UploadRequestSchema = z.object({
  title: z.string().min(1),
  file: z.instanceof(File).refine((file) => {
    // Check file size (50MB)
    if (file.size > 50 * 1024 * 1024) {
      return false
    }
    // Check file type
    return file.type.startsWith('video/')
  }, 'File must be a video under 50MB'),
  settings: ProcessingSettingsSchema
})

export async function POST(request: Request) {
  try {
    console.log('[UPLOAD_API] Starting upload request')
    
    const { userId } = auth()
    if (!userId) {
      console.log('[UPLOAD_API] Unauthorized request')
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    const formData = await request.formData()
    const title = formData.get('title') as string
    const file = formData.get('file') as File
    const settingsJson = formData.get('settings') as string
    let settings

    try {
      settings = JSON.parse(settingsJson)
    } catch (error) {
      console.error('[UPLOAD_API] Failed to parse settings:', error)
      return NextResponse.json({
        success: false,
        error: 'Invalid processing settings format'
      }, { status: 400 })
    }

    console.log('[UPLOAD_API] Received request:', {
      title,
      fileType: file?.type,
      fileSize: file?.size,
      settings
    })

    // Validate request data
    try {
      UploadRequestSchema.parse({ title, file, settings })
    } catch (validationError) {
      console.error('[UPLOAD_API] Validation error:', validationError)
      return NextResponse.json({
        success: false,
        error: 'Invalid request data. Please check file and settings.'
      }, { status: 400 })
    }

    console.log('[UPLOAD_API] Request validation successful')

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    if (buffer.length === 0) {
      console.error('[UPLOAD_API] Empty file received')
      return NextResponse.json({
        success: false,
        error: 'Empty file received'
      }, { status: 400 })
    }

    console.log('[UPLOAD_API] File converted to buffer:', {
      bufferSize: buffer.length,
      originalSize: file.size
    })
    
    // Generate S3 key and upload file
    const key = generateS3Key(userId, file.name)
    let fileUrl: string
    try {
      console.log('[UPLOAD_API] Starting S3 upload')
      fileUrl = await uploadToS3(buffer, key, file.type)
      console.log('[UPLOAD_API] S3 upload successful:', fileUrl)
    } catch (s3Error) {
      console.error('[UPLOAD_API] S3 upload error:', s3Error)
      return NextResponse.json({
        success: false,
        error: s3Error instanceof Error ? s3Error.message : 'Failed to upload file to storage'
      }, { status: 500 })
    }

    // Create video and settings records in database
    let video
    try {
      console.log('[UPLOAD_API] Creating database records')
      video = await prisma.video.create({
        data: {
          title,
          userId,
          url: fileUrl,
          status: 'PENDING',
          settings: {
            create: {
              segmentDuration: settings.segmentDuration,
              enableSceneDetection: settings.enableSceneDetection,
              enableCaptions: settings.enableCaptions,
              enableFilters: settings.enableFilters,
              selectedFilter: settings.selectedFilter,
              minSegmentLength: settings.minSegmentLength,
              maxSegments: settings.maxSegments
            }
          }
        },
        include: {
          settings: true
        }
      })
      console.log('[UPLOAD_API] Database records created:', video)
    } catch (dbError) {
      console.error('[UPLOAD_API] Database error:', dbError)
      return NextResponse.json({
        success: false,
        error: 'Failed to create video record'
      }, { status: 500 })
    }

    // Start video processing
    try {
      console.log('[UPLOAD_API] Starting video processing')
      processVideo(video.id).catch(error => {
        console.error('[UPLOAD_API] Processing error:', error)
      })
    } catch (processError) {
      console.error('[UPLOAD_API] Failed to start processing:', processError)
      // Don't fail the upload if processing fails to start
      // Just log the error and return success
    }

    console.log('[UPLOAD_API] Upload completed successfully')
    return NextResponse.json({
      success: true,
      video
    })
  } catch (error) {
    console.error('[UPLOAD_API] Unexpected error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 })
  }
}

// Handle file size limits
export const config = {
  api: {
    bodyParser: false,
    sizeLimit: '50mb'
  }
} 