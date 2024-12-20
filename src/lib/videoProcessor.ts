import ffmpeg from 'fluent-ffmpeg'
import { PrismaClient } from '@prisma/client'
import { uploadToS3, generateS3Key } from './storage'
import { generateThumbnail, generateThumbnailAtIntervals } from './thumbnailGenerator'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import os from 'os'
import { detectScenes } from './sceneDetection'
import { generateCaptions } from './captionGenerator'

interface ProcessingSettings {
  segmentDuration: number
  enableSceneDetection: boolean
  enableCaptions: boolean
  enableFilters: boolean
  selectedFilter: string
  minSegmentLength: number
  maxSegments: number
  maxDuration?: number
}

interface VideoSegment {
  start: number
  duration: number
  score: number
}

// Use system FFmpeg instead of the installer package
console.log('[FFMPEG] Using system FFmpeg')

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
          const endTime = array[index + 1] || settings.maxDuration
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
  if (settings.enableFilters && settings.selectedFilter !== 'none') {
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
      return ['split[a][b]', '[a]scale=ih*16/9:-1,boxblur=luma_radius=min(h\\,w)/20:luma_power=1[bg]', '[b]scale=-1:h[fg]', '[bg][fg]overlay=(W-w)/2:(H-h)/2']
    default:
      return []
  }
}

export async function processVideo(videoId: string) {
  console.log('[PROCESS] Starting video processing for:', videoId)
  try {
    // Get video and settings
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      include: { settings: true }
    })

    if (!video?.url) {
      throw new Error('Video not found or URL missing')
    }

    const settings = video.settings || await prisma.processingSettings.create({
      data: {
        videoId,
        segmentDuration: 15,
        enableSceneDetection: true,
        enableCaptions: false,
        enableFilters: false,
        selectedFilter: 'none',
        minSegmentLength: 10,
        maxSegments: 5
      }
    })

    // Download and process video
    const inputPath = await downloadVideo(video.url)
    const { duration } = await getVideoMetadata(inputPath)

    // Skip caption generation temporarily
    console.log('[PROCESS] Caption generation is temporarily disabled')

    // Analyze video and get segments
    const segments = await analyzeVideo(inputPath, {
      ...settings,
      maxDuration: duration
    })

    // Process each segment
    let successfulSegments = 0
    for (const [index, segment] of segments.entries()) {
      try {
        const outputPath = join(os.tmpdir(), `segment-${Date.now()}.mp4`)
        await processSegment(inputPath, outputPath, segment, settings)

        // Generate thumbnail
        const thumbnail = await generateThumbnail(outputPath, video.userId)

        // Upload to S3
        const key = generateS3Key(video.userId, `short-${Date.now()}.mp4`)
        const buffer = await readFile(outputPath)
        const url = await uploadToS3(buffer, key)

        // Create VideoShort record
        await prisma.videoShort.create({
          data: {
            videoId: video.id,
            title: `${video.title} - Part ${index + 1}`,
            url,
            durationInSeconds: segment.duration,
            thumbnailUrl: thumbnail,
            startTime: segment.start,
            endTime: segment.start + segment.duration,
            userId: video.userId,
            filter: settings.enableFilters ? settings.selectedFilter : null
          }
        })

        successfulSegments++
      } catch (error) {
        console.error(`[SEGMENT_ERROR] Failed to process segment ${index + 1}:`, error)
      }
    }

    // Update video status
    const finalStatus = successfulSegments > 0 ? 'COMPLETED' : 'FAILED'
    await prisma.video.update({
      where: { id: videoId },
      data: { status: finalStatus }
    })

    return { success: finalStatus === 'COMPLETED' }
  } catch (error) {
    console.error('[PROCESS_ERROR] Video processing failed:', error)
    await prisma.video.update({
      where: { id: videoId },
      data: { status: 'FAILED' }
    })
    return { success: false, error }
  }
} 