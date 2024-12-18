'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface VideoModalProps {
  isOpen: boolean
  onClose: () => void
  videoUrl: string
  title: string
}

export default function VideoModal({ isOpen, onClose, videoUrl, title }: VideoModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

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
          <div className="absolute right-0 top-0 pr-4 pt-4 z-10">
            <button
              type="button"
              className="rounded-md bg-black bg-opacity-50 text-white hover:text-gray-200 focus:outline-none"
              onClick={onClose}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="relative">
            <video
              ref={videoRef}
              className="w-full aspect-video"
              controls
              autoPlay
              src={videoUrl}
            >
              Your browser does not support the video tag.
            </video>
          </div>

          <div className="bg-black px-4 py-3">
            <h3 className="text-lg font-medium text-white">{title}</h3>
          </div>
        </div>
      </div>
    </div>
  )
} 