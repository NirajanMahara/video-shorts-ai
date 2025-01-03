import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Initialize S3 client with explicit configuration
const s3Client = new S3Client({
  region: process.env.STORAGE_REGION!,
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY!,
    secretAccessKey: process.env.STORAGE_SECRET_KEY!,
  },
})

const BUCKET_NAME = process.env.STORAGE_BUCKET!

// Validate S3 configuration
function validateS3Config() {
  const requiredEnvVars = {
    STORAGE_REGION: process.env.STORAGE_REGION,
    STORAGE_ACCESS_KEY: process.env.STORAGE_ACCESS_KEY,
    STORAGE_SECRET_KEY: process.env.STORAGE_SECRET_KEY,
    STORAGE_BUCKET: process.env.STORAGE_BUCKET,
  }

  const missingVars = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key)

  if (missingVars.length > 0) {
    throw new Error(`Missing required S3 configuration: ${missingVars.join(', ')}`)
  }
}

export async function uploadToS3(
  file: Buffer,
  key: string,
  contentType: string = 'video/mp4'
): Promise<string> {
  try {
    // Validate configuration before attempting upload
    validateS3Config()

    console.log('[S3] Starting upload:', {
      bucket: BUCKET_NAME,
      key,
      contentType,
      fileSize: file.length,
    })

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
      CacheControl: 'max-age=31536000', // 1 year cache
    })

    await s3Client.send(command)
    
    // Get a pre-signed URL for immediate access
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })
    
    const url = await getSignedUrl(s3Client, getCommand, { expiresIn: 604800 }) // 7 days
    console.log('[S3] Upload successful:', url)
    
    return url
  } catch (error) {
    console.error('[S3_ERROR] Upload failed:', error)
    if (error instanceof Error) {
      throw new Error(`S3 upload failed: ${error.message}`)
    }
    throw new Error('S3 upload failed: Unknown error')
  }
}

export async function getSignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
  try {
    validateS3Config()
    
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })

    return await getSignedUrl(s3Client, command, { expiresIn })
  } catch (error) {
    console.error('[S3_ERROR] Failed to generate signed URL:', error)
    throw error
  }
}

export function generateS3Key(userId: string, filename: string): string {
  const timestamp = Date.now()
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
  return `uploads/${userId}/${timestamp}-${sanitizedFilename}`
}

export function extractKeyFromUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    // The key is everything after the bucket name in the path
    const parts = urlObj.pathname.split('/')
    // Remove empty strings and the bucket name if present
    const keyParts = parts.filter(part => part && part !== BUCKET_NAME)
    return keyParts.join('/')
  } catch (error) {
    console.error('[S3_ERROR] Failed to extract key from URL:', error)
    throw new Error('Invalid S3 URL format')
  }
}

export async function deleteFromS3(url: string): Promise<void> {
  try {
    const key = extractKeyFromUrl(url)
    console.log('[S3] Deleting file:', {
      bucket: BUCKET_NAME,
      key,
    })

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })
    )

    console.log('[S3] Delete successful')
  } catch (error) {
    console.error('[S3_ERROR] Delete failed:', error)
    throw error
  }
} 