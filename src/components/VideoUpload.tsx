'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Loader2, Video, X } from 'lucide-react'

interface UploadResponse {
  success: boolean
  video: {
    id: string
    title: string
    url: string
    status: string
  }
}

export default function VideoUpload() {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return
    setSelectedFile(file)
  }, [])

  const handleUpload = async () => {
    if (!selectedFile) return

    try {
      setUploading(true)
      setError(null)
      setSuccess(false)

      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('title', selectedFile.name)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const data: UploadResponse = await response.json()
      
      if (data.success) {
        setSuccess(true)
        setSelectedFile(null)
      }
    } catch (error) {
      console.error('Upload failed:', error)
      setError('Failed to upload video. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.mov', '.avi', '.mkv']
    },
    maxFiles: 1,
    multiple: false,
    maxSize: 50 * 1024 * 1024 // 50MB limit
  })

  return (
    <div className="space-y-6">
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-200 ease-in-out
          ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'}
          ${uploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${selectedFile ? 'bg-gray-50' : ''}`}
      >
        <input {...getInputProps()} disabled={uploading} />
        
        {uploading ? (
          <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 text-indigo-500 animate-spin mb-4" />
            <p className="text-sm text-gray-600">Uploading your video...</p>
          </div>
        ) : selectedFile ? (
          <div className="flex flex-col items-center">
            <div className="relative">
              <Video className="h-12 w-12 text-indigo-500 mb-4" />
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedFile(null)
                }}
                className="absolute -top-2 -right-2 p-1 bg-red-100 rounded-full hover:bg-red-200 transition-colors"
              >
                <X className="h-4 w-4 text-red-500" />
              </button>
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">{selectedFile.name}</p>
            <p className="text-xs text-gray-500 mb-4">
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleUpload()
              }}
              disabled={uploading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
            >
              Start Upload
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-sm text-gray-600 mb-2">
              {isDragActive
                ? 'Drop your video here'
                : 'Drag and drop your video, or click to browse'}
            </p>
            <p className="text-xs text-gray-500">
              Supported formats: MP4, MOV, AVI, MKV (max 50MB)
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center bg-red-50 text-red-500 p-4 rounded-lg text-sm">
          <X className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center bg-green-50 text-green-600 p-4 rounded-lg text-sm">
          <svg
            className="h-5 w-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          Video uploaded successfully! Processing will begin shortly.
        </div>
      )}
    </div>
  )
} 