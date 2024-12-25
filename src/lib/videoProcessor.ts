import ffmpeg from 'fluent-ffmpeg'
import { PrismaClient, ProcessingSettings as PrismaProcessingSettings, Prisma } from '@prisma/client'
import { uploadToS3, generateS3Key } from './storage'
import { generateThumbnail } from './thumbnailGenerator'
import { readFile, writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import os from 'os'
import { detectScenes } from './sceneDetection'

interface ProcessingSettings extends Omit<PrismaProcessingSettings, 'id' | 'videoId' | 'createdAt' | 'updatedAt'> {
  maxDuration?: number
}

interface VideoSegment {
  start: number
  duration: number
  score: number
}

const prisma = new PrismaClient()

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

async function analyzeVideo(path: string, settings: ProcessingSettings): Promise<VideoSegment[]> {
  console.log('[ANALYZE] Starting video analysis with settings:', settings)
  
  let segments: VideoSegment[] = []

  if (settings.enableSceneDetection) {
    try {
      // Get scene changes using AI detection
      const sceneTimestamps = await detectScenes(path, settings.minSegmentLength)
      
      if (sceneTimestamps.length > 0) {
        // Convert scene changes to segments
        segments = sceneTimestamps.map((startTime, index, array) => {
          const endTime = array[index + 1] ?? settings.maxDuration ?? startTime + settings.segmentDuration
          return {
            start: startTime,
            duration: endTime - startTime,
            score: 1 // All detected scenes have maximum score
          }
        })

        // Filter segments based on minimum length and maximum count
        segments = segments
          .filter(segment => segment.duration >= settings.minSegmentLength)
          .sort((a, b) => b.score - a.score)
          .slice(0, settings.maxSegments)
      } else {
        console.log('[ANALYZE] No scenes detected, falling back to basic segmentation')
        segments = createBasicSegments(settings)
      }
    } catch (error) {
      console.error('[ANALYZE] Scene detection failed:', error)
      console.log('[ANALYZE] Falling back to basic segmentation')
      segments = createBasicSegments(settings)
    }
  } else {
    // Use basic segmentation if scene detection is disabled
    segments = createBasicSegments(settings)
  }

  console.log('[ANALYZE] Created segments:', segments)
  return segments
}

function createBasicSegments(settings: ProcessingSettings): VideoSegment[] {
  const segments: VideoSegment[] = []
  const duration = settings.maxDuration || 99
  const segmentCount = Math.min(settings.maxSegments, Math.floor(duration / settings.minSegmentLength))
  const segmentDuration = Math.max(settings.minSegmentLength, Math.min(settings.segmentDuration, duration / segmentCount))

  for (let i = 0; i < segmentCount; i++) {
    const start = i * segmentDuration
    if (start + segmentDuration <= duration) {
      segments.push({
        start,
        duration: segmentDuration,
        score: 1 - (i * 0.1) // Decreasing score for later segments
      })
    }
  }

  console.log('[ANALYZE] Created basic segments:', segments)
  return segments
}

async function processSegment(
  inputPath: string,
  outputPath: string,
  segment: VideoSegment,
  settings: ProcessingSettings
): Promise<void> {
  console.log(`[PROCESS] Processing segment:`, {
    start: segment.start,
    duration: segment.duration,
    settings
  })

  const ffmpegCommand = ffmpeg(inputPath)
    .setStartTime(segment.start)
    .setDuration(segment.duration)
    .outputOptions([
      '-c:v libx264',
      '-c:a aac',
      '-b:v 2M',
      '-b:a 128k',
      '-movflags +faststart',
    ])

  // Apply video filter if enabled
  if (settings.enableFilters && settings.selectedFilter && settings.selectedFilter !== 'none') {
    const filterOptions = getFilterOptions(settings.selectedFilter)
    ffmpegCommand.videoFilters(filterOptions)
  }

  return new Promise((resolve, reject) => {
    ffmpegCommand
      .on('start', (command) => {
        console.log('[FFMPEG] Started command:', command)
      })
      .on('progress', (progress) => {
        console.log('[FFMPEG] Processing:', progress.percent, '% done')
      })
      .on('end', () => {
        console.log('[FFMPEG] Segment processing complete')
        resolve()
      })
      .on('error', (err) => {
        console.error('[FFMPEG_ERROR]', err)
        reject(new Error(`FFmpeg error: ${err.message}`))
      })
      .save(outputPath)
  })
}

function getFilterOptions(filter: string): string[] {
  switch (filter) {
    case 'boost':
      return ['eq=contrast=1.2:brightness=0.1:saturation=1.3']
    case 'vintage':
      return ['curves=vintage']
    case 'grayscale':
      return ['colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3']
    case 'blur':
      return ['boxblur=2:1']
    default:
      return []
  }
}

export async function processVideo(videoId: string) {
  console.log('[PROCESS] Starting video processing for:', videoId)
  let inputPath: string | null = null
  let successfulSegments = 0

  try {
    // Get video and settings
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: { settings: true }
    })

    if (!video?.url) {
      throw new Error('Video not found or URL missing')
    }

    // Update status to processing
    await prisma.video.update({
      where: { id: videoId },
      data: { status: 'PROCESSING' }
    })

    // Download video
    inputPath = await downloadVideo(video.url)
    console.log('[PROCESS] Video downloaded to:', inputPath)

    // Get video metadata
    const metadata = await getVideoMetadata(inputPath)
    console.log('[PROCESS] Video metadata:', metadata)

    // Process video segments
    const settings: ProcessingSettings = {
      segmentDuration: video.settings?.segmentDuration ?? 15,
      enableSceneDetection: video.settings?.enableSceneDetection ?? true,
      enableCaptions: video.settings?.enableCaptions ?? false,
      enableFilters: video.settings?.enableFilters ?? false,
      selectedFilter: video.settings?.selectedFilter ?? 'none',
      minSegmentLength: video.settings?.minSegmentLength ?? 10,
      maxSegments: video.settings?.maxSegments ?? 5,
      selectedSegments: video.settings?.selectedSegments ?? '',
      maxDuration: metadata.duration
    }

    // Analyze video and get segments
    const segments = await analyzeVideo(inputPath, settings)
    console.log('[PROCESS] Video analysis complete, segments:', segments)

    // Process each segment
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i]
      try {
        const outputPath = join(os.tmpdir(), `segment-${i}-${Date.now()}.mp4`)
        
        // Extract and process segment
        await processSegment(inputPath, outputPath, segment, settings)
        console.log(`[PROCESS] Segment ${i + 1} processed:`, outputPath)

        // Generate thumbnail
        const thumbnail = await generateThumbnail(outputPath, video.userId)
        console.log(`[PROCESS] Thumbnail generated for segment ${i + 1}:`, thumbnail)

        // Upload to S3
        const buffer = await readFile(outputPath)
        const key = generateS3Key(video.userId, `short-${Date.now()}.mp4`)
        const url = await uploadToS3(buffer, key, 'video/mp4')
        console.log(`[PROCESS] Segment ${i + 1} uploaded to S3:`, url)

        // Create VideoShort record with title
        const shortData = {
          videoId: video.id,
          title: `${video.title} - Part ${i + 1}`,
          url,
          durationInSeconds: segment.duration,
          thumbnailUrl: thumbnail || undefined,
          startTime: segment.start,
          endTime: segment.start + segment.duration,
          userId: video.userId,
          filter: settings.enableFilters && settings.selectedFilter !== 'none' ? settings.selectedFilter : null
        }

        await prisma.videoShort.create({ data: shortData })
        console.log(`[PROCESS] Database record created for segment ${i + 1}`)

        successfulSegments++

        // Clean up temporary output file
        await unlink(outputPath)
      } catch (error) {
        console.error(`[SEGMENT_ERROR] Failed to process segment ${i + 1}:`, error)
      }
    }

    // Update final status
    const finalStatus = successfulSegments > 0 ? 'COMPLETED' : 'FAILED'
    const videoData = {
      status: finalStatus,
      durationInSeconds: metadata.duration
    }

    await prisma.video.update({
      where: { id: videoId },
      data: videoData
    })

    return { success: finalStatus === 'COMPLETED', segments: successfulSegments }
  } catch (error) {
    console.error('[PROCESS_ERROR] Video processing failed:', error)
    await prisma.video.update({
      where: { id: videoId },
      data: { status: 'FAILED' }
    })
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  } finally {
    // Clean up temporary files
    if (inputPath) {
      try {
        await unlink(inputPath)
        console.log('[CLEANUP] Removed temporary input file:', inputPath)
      } catch (cleanupError) {
        console.error('[CLEANUP_ERROR] Failed to remove temporary file:', cleanupError)
      }
    }
  }
} 