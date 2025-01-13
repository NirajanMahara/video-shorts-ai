import ffmpeg from 'fluent-ffmpeg'
import { join } from 'path'
import os from 'os'
import { readFile, unlink } from 'fs/promises'

export async function generateThumbnail(
  inputPath: string,
  timestamp: number = 0
): Promise<Buffer> {
  console.log('[THUMBNAIL] Generating thumbnail:', {
    inputPath,
    timestamp
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
      const buffer = await readFile(outputPath)
      console.log('[THUMBNAIL] File size:', buffer.length, 'bytes')
      if (buffer.length === 0) {
        throw new Error('Generated thumbnail is empty')
      }
      return buffer
    } catch (error) {
      throw new Error(`Failed to verify thumbnail: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  } catch (error) {
    console.error('[THUMBNAIL_ERROR] Failed to generate thumbnail:', error)
    throw new Error(`Thumbnail generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  } finally {
    // Clean up temporary file
    try {
      await unlink(outputPath)
      console.log('[THUMBNAIL] Cleaned up temporary file')
    } catch (error) {
      console.error('[THUMBNAIL] Failed to clean up temporary file:', error)
    }
  }
}

export async function generateThumbnailAtIntervals(
  inputPath: string,
  duration: number,
  count: number = 3
): Promise<Buffer[]> {
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
    const thumbnails: Buffer[] = []
    for (let i = 0; i < timestamps.length; i++) {
      try {
        const buffer = await generateThumbnail(inputPath, timestamps[i])
        thumbnails.push(buffer)
        console.log(`[THUMBNAILS] Generated thumbnail ${i + 1}/${timestamps.length}`)
      } catch (error) {
        console.error(`[THUMBNAILS_ERROR] Failed to generate thumbnail ${i + 1}:`, error)
        // Continue with remaining thumbnails
      }
    }

    if (thumbnails.length === 0) {
      throw new Error('Failed to generate any thumbnails')
    }

    console.log('[THUMBNAILS] Successfully generated thumbnails')
    return thumbnails
  } catch (error) {
    console.error('[THUMBNAILS_ERROR] Failed to generate thumbnails:', error)
    throw error
  }
} 