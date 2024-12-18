'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import ShareButton from './ShareButton'

interface VideoModalProps {
  isOpen: boolean
  onClose: () => void
  videoUrl: string
  title: string
}

export default function VideoModal({ isOpen, onClose, videoUrl, title }: VideoModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isLoading, setIsLoading] = useState(true)

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
    if (!isOpen && videoRef.current) {
      videoRef.current.pause()
    }
  }, [isOpen])

  const handleVideoLoad = () => {
    setIsLoading(false)
  }

  const handleVideoError = () => {
    setIsLoading(false)
    // You could add error state handling here
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
              src={videoUrl}
            >
              Your browser does not support the video tag.
            </video>
          </div>

          <div className="bg-black px-4 py-3 flex items-center justify-between">
            <h3 className="text-lg font-medium text-white">{title}</h3>
          </div>
        </div>
      </div>
    </div>
  )
} 