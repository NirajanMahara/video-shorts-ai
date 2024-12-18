'use client'

import { useEffect, useState } from 'react'
import { auth } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { Video, Clock, CheckCircle, XCircle, Play } from 'lucide-react'
import Image from 'next/image'
import VideoModal from '@/components/VideoModal'

interface VideoShort {
  id: string
  title: string
  url: string
  thumbnailUrl: string | null
  durationInSeconds: number
}

interface VideoType {
  id: string
  title: string
  status: string
  url: string | null
  createdAt: string
  updatedAt: string
  shorts: VideoShort[]
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export default function DashboardPage() {
  const [videos, setVideos] = useState<VideoType[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedShort, setSelectedShort] = useState<VideoShort | null>(null)

  const fetchVideos = async () => {
    try {
      const response = await fetch('/api/videos')
      if (!response.ok) throw new Error('Failed to fetch videos')
      const data = await response.json()
      setVideos(data.videos)
    } catch (error) {
      console.error('Error fetching videos:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVideos()
    // Refresh every 5 seconds if there are processing videos
    const interval = setInterval(() => {
      if (videos.some(video => video.status === 'PROCESSING')) {
        fetchVideos()
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [videos])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-yellow-500 animate-pulse" />
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Your Videos</h1>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span>Total: {videos.length}</span>
            <span>•</span>
            <span>Processing: {videos.filter(v => v.status === 'PROCESSING').length}</span>
            <span>•</span>
            <span>Completed: {videos.filter(v => v.status === 'COMPLETED').length}</span>
          </div>
        </div>
        
        {videos.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
            <Video className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No videos yet</h3>
            <p className="text-gray-500 mb-4">Upload your first video to get started</p>
            <a
              href="/"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Upload a Video
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <div
                key={video.id}
                className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow duration-200"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="font-medium text-gray-900 line-clamp-1" title={video.title}>
                      {video.title}
                    </h3>
                    {getStatusIcon(video.status)}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                        ${
                          video.status === 'COMPLETED'
                            ? 'bg-green-100 text-green-800'
                            : video.status === 'FAILED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                    >
                      {video.status.toLowerCase()}
                    </span>
                    <time className="text-gray-500" dateTime={video.createdAt}>
                      {new Date(video.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </time>
                  </div>
                </div>
                {video.status === 'COMPLETED' && video.shorts.length > 0 && (
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                    <p className="text-sm font-medium text-gray-900 mb-4">Generated Shorts:</p>
                    <div className="grid grid-cols-1 gap-4">
                      {video.shorts.map((short, index) => (
                        <div
                          key={short.id}
                          className="group relative cursor-pointer"
                          onClick={() => setSelectedShort(short)}
                        >
                          <div className="aspect-video w-full relative rounded-lg overflow-hidden bg-gray-100">
                            {short.thumbnailUrl ? (
                              <Image
                                src={short.thumbnailUrl}
                                alt={`Thumbnail for ${short.title}`}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Video className="h-8 w-8 text-gray-400" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                              <Play className="h-12 w-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black bg-opacity-75 rounded text-white text-xs">
                              {formatDuration(short.durationInSeconds)}
                            </div>
                          </div>
                          <div className="mt-2">
                            <span className="text-sm text-gray-600">Part {index + 1}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <VideoModal
        isOpen={!!selectedShort}
        onClose={() => setSelectedShort(null)}
        videoUrl={selectedShort?.url || ''}
        title={selectedShort?.title || ''}
      />
    </>
  )
} 