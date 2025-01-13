'use client'

import { useEffect, useState } from 'react'
import { Video } from '@/types'
import { formatDistanceToNow } from 'date-fns'

export default function VideoList() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await fetch('/api/videos')
        if (!response.ok) {
          throw new Error('Failed to fetch videos')
        }
        const data = await response.json()
        setVideos(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch videos')
      } finally {
        setLoading(false)
      }
    }

    fetchVideos()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center text-red-700">
        {error}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {videos.map((video) => (
        <div key={video.id} className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="relative h-48 bg-gray-100">
            {video.thumbnailUrl ? (
              <img
                src={video.thumbnailUrl}
                alt={video.title || 'Video thumbnail'}
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  // Show fallback icon
                  const parent = target.parentElement
                  if (parent) {
                    parent.classList.add('flex', 'items-center', 'justify-center')
                    const svg = document.createElement('svg')
                    svg.setAttribute('class', 'w-12 h-12 text-gray-400')
                    svg.setAttribute('fill', 'none')
                    svg.setAttribute('stroke', 'currentColor')
                    svg.setAttribute('viewBox', '0 0 24 24')
                    svg.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />`
                    parent.appendChild(svg)
                  }
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <svg 
                  className="w-12 h-12 text-gray-400"
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" 
                  />
                </svg>
              </div>
            )}
          </div>
          <div className="p-4">
            <h3 className="font-semibold text-lg mb-2">{video.title || 'Untitled Video'}</h3>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">
                {formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}
              </span>
              <span className={`text-sm px-2 py-1 rounded-full ${
                video.status === 'COMPLETED' 
                  ? 'bg-green-100 text-green-800'
                  : video.status === 'PROCESSING'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {video.status.toLowerCase()}
              </span>
            </div>
            {video.status === 'COMPLETED' && video.url && (
              <a
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 block text-center bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 transition-colors"
              >
                Watch Video
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  )
} 