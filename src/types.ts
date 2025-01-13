export type Video = {
  id: string
  title: string
  userId: string
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED'
  url?: string | null
  durationInSeconds?: number | null
  thumbnailUrl?: string | null
  description?: string | null
  createdAt: Date
  updatedAt: Date
}

export type ProcessingSettings = {
  id: string
  videoId: string
  segmentDuration: number
  enableSceneDetection: boolean
  enableCaptions: boolean
  enableFilters: boolean
  selectedFilter: string
  minSegmentLength: number
  maxSegments: number
  selectedSegments: string
  createdAt: Date
  updatedAt: Date
}

export type VideoShort = {
  id: string
  videoId: string
  title: string
  url: string
  durationInSeconds: number
  thumbnailUrl?: string | null
  startTime: number
  endTime: number
  userId: string
  filter?: string | null
  createdAt: Date
  updatedAt: Date
}

export type Caption = {
  id: string
  text: string
  startTime: number
  endTime: number
  videoId?: string | null
  shortId?: string | null
  createdAt: Date
  updatedAt: Date
} 