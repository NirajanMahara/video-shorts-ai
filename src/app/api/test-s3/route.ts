import { NextResponse } from 'next/server'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export async function GET() {
  try {
    // Create S3 client
    const s3Client = new S3Client({
      region: process.env.STORAGE_REGION!,
      credentials: {
        accessKeyId: process.env.STORAGE_ACCESS_KEY!,
        secretAccessKey: process.env.STORAGE_SECRET_KEY!,
      },
    })

    // Log configuration (without sensitive data)
    console.log('Testing S3 connection with config:', {
      region: process.env.STORAGE_REGION,
      bucket: process.env.STORAGE_BUCKET,
    })

    // Create a test file
    const testBuffer = Buffer.from('Hello, S3!')
    const testKey = `test-${Date.now()}.txt`

    // Create upload command
    const command = new PutObjectCommand({
      Bucket: process.env.STORAGE_BUCKET!,
      Key: testKey,
      Body: testBuffer,
      ContentType: 'text/plain',
    })

    // Try to upload
    await s3Client.send(command)
    
    // Get a pre-signed URL for the test file
    const getCommand = new GetObjectCommand({
      Bucket: process.env.STORAGE_BUCKET!,
      Key: testKey,
    })
    
    const url = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 })
    
    return NextResponse.json({
      success: true,
      message: 'S3 connection successful',
      url,
      config: {
        region: process.env.STORAGE_REGION,
        bucket: process.env.STORAGE_BUCKET,
      }
    })
  } catch (error) {
    console.error('S3 Test Error:', error)
    
    // Return detailed error information
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      } : 'Unknown error',
      config: {
        region: process.env.STORAGE_REGION,
        bucket: process.env.STORAGE_BUCKET,
      }
    }, { status: 500 })
  }
} 