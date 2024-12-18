import ffmpeg from 'fluent-ffmpeg'
import { PrismaClient } from '@prisma/client'
import { uploadToS3, generateS3Key } from './storage'
import { generateThumbnail, generateThumbnailAtIntervals } from './thumbnailGenerator'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import os from 'os'

// Use system FFmpeg instead of the installer package
console.log('[FFMPEG] Using system FFmpeg')

const prisma = new PrismaClient()

interface VideoSegment {
  start: number
  duration: number
  score: number
}

async function downloadVideo(url: string): Promise<string> {
  console.log('[DOWNLOAD] Starting video download from:', url)
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.status} ${response.statusText}`)
    }
    const buffer = await response.arrayBuffer()
    const tempPath = join(os.tmpdir(), `video-${Date.now()}.mp4`)
    await writeFile(tempPath, Buffer.from(buffer))
    console.log('[DOWNLOAD] Video downloaded successfully to:', tempPath)
    
    // Verify file exists and has content
    const stats = await readFile(tempPath)
    if (!stats || stats.length === 0) {
      throw new Error('Downloaded file is empty')
    }
    console.log('[DOWNLOAD] File size:', stats.length, 'bytes')
    
    return tempPath
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown download error'
    console.error('[DOWNLOAD_ERROR]', errorMessage)
    throw new Error(`Download failed: ${errorMessage}`)
  }
}

async function getVideoMetadata(path: string): Promise<{ duration: number }> {
  console.log('[METADATA] Getting metadata for:', path)
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(path, (err, metadata) => {
      if (err) {
        console.error('[METADATA_ERROR]', err)
        reject(new Error(`Failed to get metadata: ${err.message}`))
        return
      }
      
      console.log('[METADATA] Raw metadata:', JSON.stringify(metadata, null, 2))
      
      if (!metadata?.format?.duration) {
        console.error('[METADATA_ERROR] Invalid metadata:', metadata)
        reject(new Error('Invalid video metadata: duration not found'))
        return
      }
      
      console.log('[METADATA] Successfully extracted metadata:', metadata.format)
      resolve({
        duration: metadata.format.duration,
      })
    })
  })
}

async function extractSegment(
  inputPath: string,
  outputPath: string,
  start: number,
  duration: number
): Promise<void> {
  console.log(`[EXTRACT] Extracting segment: start=${start}, duration=${duration}`)
  console.log(`[EXTRACT] Input path: ${inputPath}`)
  console.log(`[EXTRACT] Output path: ${outputPath}`)
  
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(start)
      .setDuration(duration)
      .output(outputPath)
      .outputOptions([
        '-c:v libx264',
        '-c:a aac',
        '-b:v 2M',
        '-b:a 128k',
        '-movflags +faststart',
        '-y'
      ])
      .on('start', (command) => {
        console.log('[FFMPEG] Started command:', command)
      })
      .on('progress', (progress) => {
        console.log('[FFMPEG] Processing:', progress.percent, '% done')
      })
      .on('end', () => {
        console.log('[FFMPEG] Segment extraction complete')
        resolve()
      })
      .on('error', (err) => {
        console.error('[FFMPEG_ERROR]', err)
        console.error('[FFMPEG_ERROR] Command:', err.message)
        reject(new Error(`FFmpeg error: ${err.message}`))
      })
      .run()
  })
}

async function analyzeVideo(path: string): Promise<VideoSegment[]> {
  console.log('[ANALYZE] Starting video analysis')
  // TODO: Implement actual video analysis
  // For now, we'll create segments of 15 seconds each
  const { duration } = await getVideoMetadata(path)
  const segments: VideoSegment[] = []
  let currentTime = 0

  while (currentTime < duration) {
    const segmentDuration = Math.min(15, duration - currentTime)
    segments.push({
      start: currentTime,
      duration: segmentDuration,
      score: Math.random() // Replace with actual analysis score
    })
    currentTime += segmentDuration
  }

  const selectedSegments = segments.sort((a, b) => b.score - a.score).slice(0, 3)
  console.log('[ANALYZE] Created segments:', selectedSegments)
  return selectedSegments
}

export async function processVideo(videoId: string) {
  console.log('[PROCESS] Starting video processing for:', videoId)
  try {
    // Update status to processing
    await prisma.video.update({
      where: { id: videoId },
      data: { status: 'PROCESSING' }
    })
    console.log('[PROCESS] Updated status to PROCESSING')

    // Get video details
    const video = await prisma.video.findUnique({
      where: { id: videoId }
    })

    if (!video?.url) {
      throw new Error('Video not found or URL missing')
    }
    console.log('[PROCESS] Found video:', { id: video.id, title: video.title, url: video.url })

    // Download video
    console.log('[PROCESS] Starting video download')
    const inputPath = await downloadVideo(video.url)
    console.log('[PROCESS] Video downloaded to:', inputPath)

    // Verify the file exists and has content
    try {
      const stats = await readFile(inputPath)
      console.log('[PROCESS] Downloaded file size:', stats.length, 'bytes')
      if (stats.length === 0) {
        throw new Error('Downloaded file is empty')
      }
    } catch (error) {
      throw new Error(`Failed to verify downloaded file: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Get video metadata
    console.log('[PROCESS] Extracting video metadata')
    const { duration } = await getVideoMetadata(inputPath)
    console.log('[PROCESS] Video duration:', duration, 'seconds')

    // Create a test segment to verify FFmpeg is working
    console.log('[PROCESS] Testing FFmpeg with a small segment')
    const testOutputPath = join(os.tmpdir(), `test-${Date.now()}.mp4`)
    await extractSegment(inputPath, testOutputPath, 0, Math.min(5, duration))
    console.log('[PROCESS] FFmpeg test successful')

    // Generate thumbnails
    console.log('[PROCESS] Generating thumbnails')
    let mainThumbnail: string | null = null
    try {
      const thumbnails = await generateThumbnailAtIntervals(inputPath, video.userId, duration)
      mainThumbnail = thumbnails[0]
      console.log('[PROCESS] Generated thumbnails:', thumbnails)
    } catch (error) {
      console.error('[PROCESS] Failed to generate thumbnails:', error)
      // Continue processing even if thumbnail generation fails
    }

    // Update video with metadata
    console.log('[PROCESS] Updating video metadata')
    await prisma.video.update({
      where: { id: videoId },
      data: {
        status: 'PROCESSING',
        durationInSeconds: duration,
        ...(mainThumbnail ? { thumbnailUrl: mainThumbnail } : {})
      }
    })
    console.log('[PROCESS] Updated video metadata')

    // Analyze video
    console.log('[PROCESS] Analyzing video for segments')
    const segments = await analyzeVideo(inputPath)
    console.log('[PROCESS] Found', segments.length, 'segments to process')

    let successfulSegments = 0
    // Process each segment
    for (const [index, segment] of segments.entries()) {
      console.log(`[PROCESS] Processing segment ${index + 1}/${segments.length}`)
      const outputPath = join(os.tmpdir(), `segment-${Date.now()}.mp4`)
      
      try {
        // Extract segment
        console.log(`[PROCESS] Extracting segment ${index + 1}:`, {
          start: segment.start,
          duration: segment.duration,
          inputPath,
          outputPath
        })
        await extractSegment(
          inputPath,
          outputPath,
          segment.start,
          segment.duration
        )
        console.log(`[PROCESS] Segment ${index + 1} extracted successfully`)

        // Generate thumbnail
        console.log(`[PROCESS] Generating thumbnail for segment ${index + 1}`)
        const shortThumbnail = await generateThumbnail(outputPath, video.userId)
        console.log(`[PROCESS] Thumbnail generated for segment ${index + 1}:`, shortThumbnail)

        // Upload to S3
        console.log(`[PROCESS] Uploading segment ${index + 1} to S3`)
        const key = generateS3Key(video.userId, `short-${Date.now()}.mp4`)
        const buffer = await readFile(outputPath)
        const url = await uploadToS3(buffer, key)
        console.log(`[PROCESS] Segment ${index + 1} uploaded to S3:`, url)

        // Create VideoShort record
        console.log(`[PROCESS] Creating database record for segment ${index + 1}`)
        await prisma.videoShort.create({
          data: {
            videoId: video.id,
            title: `${video.title} - Part ${index + 1}`,
            url,
            durationInSeconds: segment.duration,
            thumbnailUrl: shortThumbnail,
            startTime: segment.start,
            endTime: segment.start + segment.duration,
            userId: video.userId
          }
        })
        console.log(`[PROCESS] Database record created for segment ${index + 1}`)
        successfulSegments++
      } catch (error) {
        console.error(`[SEGMENT_ERROR] Failed to process segment ${index + 1}:`, error)
        // Continue with next segment
      }
    }

    // Update video status based on success
    const finalStatus = successfulSegments > 0 ? 'COMPLETED' : 'FAILED'
    console.log(`[PROCESS] Updating video status to ${finalStatus}`)
    await prisma.video.update({
      where: { id: videoId },
      data: { status: finalStatus }
    })

    if (finalStatus === 'COMPLETED') {
      console.log('[PROCESS] Video processing completed successfully')
      return { success: true }
    } else {
      throw new Error('Failed to process any segments successfully')
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[PROCESS_ERROR] Video processing failed:', errorMessage)
    if (error instanceof Error) {
      console.error('[PROCESS_ERROR] Stack trace:', error.stack)
    }
    
    // Update video status to failed
    try {
      await prisma.video.update({
        where: { id: videoId },
        data: { status: 'FAILED' }
      })
      console.log('[PROCESS] Updated status to FAILED')
    } catch (updateError) {
      console.error('[PROCESS_ERROR] Failed to update status:', updateError)
    }

    return { success: false, error: errorMessage }
  }
} 