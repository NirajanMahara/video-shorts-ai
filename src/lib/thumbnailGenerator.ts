import ffmpeg from 'fluent-ffmpeg'
import { join } from 'path'
import os from 'os'
import { uploadToS3, generateS3Key } from './storage'
import { readFile } from 'fs/promises'

export async function generateThumbnail(
  inputPath: string,
  userId: string,
  timestamp: number = 0
): Promise<string> {
  console.log('[THUMBNAIL] Generating thumbnail:', {
    inputPath,
    timestamp,
    userId
  })

  const outputPath = join(os.tmpdir(), `thumbnail-${Date.now()}.jpg`)
  console.log('[THUMBNAIL] Output path:', outputPath)

  try {
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .on('start', (command) => {
          console.log('[THUMBNAIL] FFmpeg command:', command)
        })
        .on('progress', (progress) => {
          console.log('[THUMBNAIL] Progress:', progress)
        })
        .on('end', () => {
          console.log('[THUMBNAIL] Generation complete')
          resolve()
        })
        .on('error', (err) => {
          console.error('[THUMBNAIL_ERROR] FFmpeg error:', err)
          reject(err)
        })
        .seekInput(timestamp)
        .outputOptions([
          '-frames:v 1',
          '-q:v 2',
          '-vf scale=640:360'
        ])
        .output(outputPath)
        .run()
    })

    // Verify thumbnail was created
    try {
      const stats = await readFile(outputPath)
      console.log('[THUMBNAIL] File size:', stats.length, 'bytes')
      if (stats.length === 0) {
        throw new Error('Generated thumbnail is empty')
      }
    } catch (error) {
      throw new Error(`Failed to verify thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Upload thumbnail to S3
    console.log('[THUMBNAIL] Uploading to S3')
    const buffer = await readFile(outputPath)
    const key = generateS3Key(userId, `thumbnails/${Date.now()}.jpg`)
    const url = await uploadToS3(buffer, key, 'image/jpeg')
    console.log('[THUMBNAIL] Upload successful:', url)

    return url
  } catch (error) {
    console.error('[THUMBNAIL_ERROR] Failed to generate thumbnail:', error)
    // Return a default thumbnail URL or throw error based on your requirements
    throw new Error(`Thumbnail generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function generateThumbnailAtIntervals(
  inputPath: string,
  userId: string,
  duration: number,
  count: number = 3
): Promise<string[]> {
  console.log('[THUMBNAILS] Generating thumbnails at intervals:', {
    inputPath,
    duration,
    count
  })

  try {
    // Ensure duration is valid
    if (!duration || duration <= 0) {
      throw new Error('Invalid video duration')
    }

    // Calculate timestamps
    const interval = duration / (count + 1)
    const timestamps = Array.from(
      { length: count },
      (_, i) => Math.min(interval * (i + 1), duration - 1)
    )
    console.log('[THUMBNAILS] Using timestamps:', timestamps)

    // Generate thumbnails sequentially to avoid overwhelming the system
    const thumbnailUrls: string[] = []
    for (let i = 0; i < timestamps.length; i++) {
      try {
        const url = await generateThumbnail(inputPath, userId, timestamps[i])
        thumbnailUrls.push(url)
        console.log(`[THUMBNAILS] Generated thumbnail ${i + 1}/${timestamps.length}:`, url)
      } catch (error) {
        console.error(`[THUMBNAILS_ERROR] Failed to generate thumbnail ${i + 1}:`, error)
        // Continue with remaining thumbnails
      }
    }

    if (thumbnailUrls.length === 0) {
      throw new Error('Failed to generate any thumbnails')
    }

    console.log('[THUMBNAILS] Successfully generated thumbnails:', thumbnailUrls)
    return thumbnailUrls
  } catch (error) {
    console.error('[THUMBNAILS_ERROR] Failed to generate thumbnails:', error)
    throw error
  }
} 