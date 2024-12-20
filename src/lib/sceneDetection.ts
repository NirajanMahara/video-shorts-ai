import ffmpeg from 'fluent-ffmpeg'
import { join } from 'path'
import os from 'os'
import { readFile, writeFile, unlink } from 'fs/promises'

interface SceneChange {
  timestamp: number
  score: number
}

export async function detectScenes(videoPath: string, minSceneLength: number = 5): Promise<number[]> {
  console.log('[SCENE_DETECTION] Starting scene detection:', {
    videoPath,
    minSceneLength,
  })

  const outputPath = join(os.tmpdir(), `scenes-${Date.now()}.txt`)
  
  try {
    // Run FFmpeg scene detection with improved settings
    await new Promise<void>((resolve, reject) => {
      ffmpeg(videoPath)
        .outputOptions([
          '-vf select=\'gt(scene,0.3)\',metadata=print:file=' + outputPath,
          '-f null'
        ])
        .on('start', (command) => {
          console.log('[SCENE_DETECTION] FFmpeg command:', command)
        })
        .on('end', () => {
          console.log('[SCENE_DETECTION] Scene detection complete')
          resolve()
        })
        .on('error', (err) => {
          console.error('[SCENE_DETECTION] FFmpeg error:', err)
          reject(err)
        })
        .save('/dev/null')
    })

    // Read and parse the scene detection output
    const output = await readFile(outputPath, 'utf-8')
    console.log('[SCENE_DETECTION] Raw output:', output)

    const scenes: SceneChange[] = []
    const lines = output.split('\n')
    
    let currentFrame: { pts_time?: string, score?: string } = {}
    
    for (const line of lines) {
      if (line.includes('pts_time:')) {
        currentFrame.pts_time = line.match(/pts_time:([\d.]+)/)?.[1]
      } else if (line.includes('scene_score=')) {
        currentFrame.score = line.match(/scene_score=([\d.]+)/)?.[1]
        
        if (currentFrame.pts_time && currentFrame.score) {
          const timestamp = parseFloat(currentFrame.pts_time)
          const score = parseFloat(currentFrame.score)
          
          if (!isNaN(timestamp) && !isNaN(score) && timestamp > 0) {
            scenes.push({ timestamp, score })
          }
          
          // Reset current frame
          currentFrame = {}
        }
      }
    }

    console.log('[SCENE_DETECTION] Detected scenes:', scenes)

    // Filter scenes based on minimum length and merge close scenes
    const filteredScenes = scenes
      .filter((scene, index, array) => {
        if (index === 0) return true
        const prevScene = array[index - 1]
        return (scene.timestamp - prevScene.timestamp) >= minSceneLength
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5) // Keep top 5 scene changes

    console.log('[SCENE_DETECTION] Filtered scenes:', filteredScenes)

    // Clean up temporary file
    try {
      await unlink(outputPath)
    } catch (error) {
      console.error('[SCENE_DETECTION] Failed to clean up temp file:', error)
    }

    return filteredScenes.map(scene => scene.timestamp)
  } catch (error) {
    console.error('[SCENE_DETECTION] Error:', error)
    throw new Error(`Scene detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
} 