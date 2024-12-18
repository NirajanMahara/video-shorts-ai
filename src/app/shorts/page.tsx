'use client'

import { useEffect, useState } from 'react'
import { Video, Play } from 'lucide-react'
import Image from 'next/image'
import VideoModal from '@/components/VideoModal'

interface Short {
  id: string
  title: string
  url: string
  thumbnailUrl: string | null
  durationInSeconds: number
  video: {
    title: string
  }
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export default function ShortsPage() {
  const [shorts, setShorts] = useState<Short[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedShort, setSelectedShort] = useState<Short | null>(null)

  useEffect(() => {
    const fetchShorts = async () => {
      try {
        const response = await fetch('/api/shorts')
        if (!response.ok) throw new Error('Failed to fetch shorts')
        const data = await response.json()
        setShorts(data.shorts)
      } catch (error) {
        console.error('Error fetching shorts:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchShorts()
  }, [])

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
          <h1 className="text-2xl font-bold text-gray-900">Your Shorts</h1>
          <span className="text-sm text-gray-500">Total: {shorts.length}</span>
        </div>

        {shorts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
            <Video className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No shorts yet</h3>
            <p className="text-gray-500 mb-4">Upload and process a video to generate shorts</p>
            <a
              href="/"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Upload a Video
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {shorts.map((short) => (
              <div
                key={short.id}
                className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-shadow duration-200 cursor-pointer"
                onClick={() => setSelectedShort(short)}
              >
                <div className="group relative">
                  <div className="aspect-video w-full relative rounded-t-lg overflow-hidden bg-gray-100">
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
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900 line-clamp-1 mb-1" title={short.title}>
                      {short.title}
                    </h3>
                    <p className="text-sm text-gray-500 line-clamp-1" title={short.video.title}>
                      From: {short.video.title}
                    </p>
                  </div>
                </div>
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