'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Loader2, Subtitles } from 'lucide-react'
import ShareButton from './ShareButton'

interface VideoModalProps {
  isOpen: boolean
  onClose: () => void
  videoUrl: string
  title: string
  videoId?: string
  shortId?: string
}

interface Caption {
  text: string
  start: number
  end: number
}

export default function VideoModal({ isOpen, onClose, videoUrl, title, videoId, shortId }: VideoModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [captions, setCaptions] = useState<Caption[]>([])
  const [currentCaption, setCurrentCaption] = useState<Caption | null>(null)
  const [showCaptions, setShowCaptions] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (!isOpen) {
      if (videoRef.current) {
        videoRef.current.pause()
      }
      setCaptions([])
      setCurrentCaption(null)
    }
  }, [isOpen])

  useEffect(() => {
    async function fetchCaptions() {
      if (!videoId && !shortId) return

      try {
        const response = await fetch(`/api/captions?${videoId ? `videoId=${videoId}` : `shortId=${shortId}`}`)
        if (!response.ok) throw new Error('Failed to fetch captions')
        const data = await response.json()
        setCaptions(data.captions)
      } catch (error) {
        console.error('Error fetching captions:', error)
        setError('Failed to load captions')
      }
    }

    if (isOpen) {
      fetchCaptions()
    }
  }, [isOpen, videoId, shortId])

  const handleTimeUpdate = () => {
    if (!videoRef.current || !showCaptions) {
      setCurrentCaption(null)
      return
    }

    const currentTime = videoRef.current.currentTime
    const caption = captions.find(
      cap => currentTime >= cap.start && currentTime <= cap.end
    )

    setCurrentCaption(caption || null)
  }

  const handleVideoLoad = () => {
    setIsLoading(false)
    setError(null)
  }

  const handleVideoError = () => {
    setIsLoading(false)
    setError('Failed to load video')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <div
          ref={modalRef}
          className="inline-block transform overflow-hidden rounded-lg bg-black text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:align-middle"
        >
          <div className="absolute right-0 top-0 pr-4 pt-4 z-10 flex items-center space-x-2">
            <button
              type="button"
              className="rounded-md bg-black bg-opacity-50 p-2 text-white hover:text-gray-200 focus:outline-none"
              onClick={() => setShowCaptions(!showCaptions)}
              title={showCaptions ? 'Hide captions' : 'Show captions'}
            >
              <Subtitles className="h-5 w-5" />
            </button>
            <ShareButton
              url={videoUrl}
              title={title}
              className="text-white hover:text-gray-200"
            />
            <button
              type="button"
              className="rounded-md bg-black bg-opacity-50 text-white hover:text-gray-200 focus:outline-none"
              onClick={onClose}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="relative">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
            )}
            <video
              ref={videoRef}
              className="w-full aspect-video"
              controls
              autoPlay
              playsInline
              onLoadedData={handleVideoLoad}
              onError={handleVideoError}
              onTimeUpdate={handleTimeUpdate}
              src={videoUrl}
            >
              Your browser does not support the video tag.
            </video>

            {showCaptions && currentCaption && (
              <div className="absolute bottom-16 left-0 right-0 text-center">
                <div className="inline-block bg-black bg-opacity-75 px-4 py-2 rounded-lg">
                  <p className="text-white text-lg">{currentCaption.text}</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-black px-4 py-3 flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">{title}</h3>
            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
} 