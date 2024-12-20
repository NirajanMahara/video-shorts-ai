import ffmpeg from 'fluent-ffmpeg'
import { join } from 'path'
import os from 'os'
import { readFile, writeFile, unlink } from 'fs/promises'
import { PrismaClient } from '@prisma/client'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const prisma = new PrismaClient()

interface TranscriptionSegment {
  text: string
  start: number
  end: number
}

interface WhisperSegment {
  text: string
  start: number
  end: number
}

async function extractAudio(videoPath: string): Promise<string> {
  console.log('[CAPTION] Extracting audio from video:', videoPath)
  
  const outputPath = join(os.tmpdir(), `audio-${Date.now()}.wav`)
  
  await new Promise<void>((resolve, reject) => {
    ffmpeg(videoPath)
      .toFormat('wav')
      .outputOptions([
        '-ac 1',  // mono audio
        '-ar 16000',  // 16kHz sample rate
        '-acodec pcm_s16le'  // 16-bit PCM
      ])
      .on('start', (command) => {
        console.log('[CAPTION] FFmpeg command:', command)
      })
      .on('end', () => {
        console.log('[CAPTION] Audio extraction complete')
        resolve()
      })
      .on('error', (err) => {
        console.error('[CAPTION] FFmpeg error:', err)
        reject(err)
      })
      .save(outputPath)
  })

  return outputPath
}

async function transcribeAudio(audioPath: string): Promise<TranscriptionSegment[]> {
  console.log('[CAPTION] Starting transcription:', audioPath)
  
  try {
    // For now, return a simple placeholder caption
    // This is a temporary solution until we fix the Whisper integration
    return [{
      text: "Auto-generated captions are temporarily unavailable",
      start: 0,
      end: 5
    }]
  } catch (error) {
    console.error('[CAPTION] Transcription error:', error)
    throw new Error('Failed to transcribe audio')
  }
}

export async function generateCaptions(
  videoPath: string,
  videoId: string,
  shortId?: string
): Promise<void> {
  let audioPath: string | undefined
  
  try {
    console.log('[CAPTION] Starting caption generation:', {
      videoPath,
      videoId,
      shortId
    })

    // Extract audio from video
    audioPath = await extractAudio(videoPath)

    // Get transcription
    const segments = await transcribeAudio(audioPath)

    // Save captions to database
    for (const segment of segments) {
      await prisma.caption.create({
        data: {
          text: segment.text,
          startTime: segment.start,
          endTime: segment.end,
          ...(shortId ? { shortId } : { videoId })
        }
      })
    }

    console.log('[CAPTION] Caption generation complete')
  } catch (error) {
    console.error('[CAPTION] Error generating captions:', error)
    throw error
  } finally {
    // Clean up temporary audio file
    if (audioPath) {
      try {
        await unlink(audioPath)
      } catch (error) {
        console.error('[CAPTION] Failed to clean up audio file:', error)
      }
    }
  }
}

export async function getCaptions(
  videoId?: string,
  shortId?: string
): Promise<TranscriptionSegment[]> {
  const captions = await prisma.Caption.findMany({
    where: {
      OR: [
        { videoId: videoId },
        { shortId: shortId }
      ]
    },
    orderBy: {
      startTime: 'asc'
    }
  })

  return captions.map((caption: { text: string, startTime: number, endTime: number }) => ({
    text: caption.text,
    start: caption.startTime,
    end: caption.endTime
  }))
} 