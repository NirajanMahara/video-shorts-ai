'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, Loader2, Video, X } from 'lucide-react'

interface UploadResponse {
  success: boolean
  video?: {
    id: string
    title: string
    url: string
    status: string
  }
  error?: string
}

export default function VideoUpload() {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number>(0)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      setError('File size exceeds 50MB limit')
      return
    }

    // Validate file type
    if (!file.type.startsWith('video/')) {
      setError('Please upload a valid video file')
      return
    }

    setSelectedFile(file)
    setError(null)
  }, [])

  const handleUpload = async () => {
    if (!selectedFile) return

    try {
      setUploading(true)
      setError(null)
      setSuccess(false)
      setUploadProgress(0)

      console.log('[UPLOAD] Starting upload:', {
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size
      })

      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('title', selectedFile.name)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      console.log('[UPLOAD] Response status:', response.status)
      const responseText = await response.text()
      console.log('[UPLOAD] Response text:', responseText)

      let data: UploadResponse
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error('[UPLOAD] Failed to parse response:', parseError)
        console.error('[UPLOAD] Raw response:', responseText)
        throw new Error('Server returned an invalid response format')
      }
      
      if (!response.ok || !data.success) {
        console.error('[UPLOAD] Upload failed:', data.error)
        throw new Error(data.error || `Upload failed with status ${response.status}`)
      }

      if (data.video) {
        console.log('[UPLOAD] Upload successful:', data.video)
        setSuccess(true)
        setSelectedFile(null)
        setUploadProgress(100)
      } else {
        throw new Error('Upload succeeded but no video data returned')
      }
    } catch (error) {
      console.error('[UPLOAD] Error:', error)
      setError(
        error instanceof Error 
          ? error.message 
          : 'Failed to upload video. Please try again.'
      )
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
            <p className="text-sm text-gray-600">Uploading your video... {uploadProgress}%</p>
          </div>
        ) : selectedFile ? (
          <div className="flex flex-col items-center">
            <div className="relative">
              <Video className="h-12 w-12 text-indigo-500 mb-4" />
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedFile(null)
                  setError(null)
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
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          <X className="h-5 w-5 mr-2 flex-shrink-0" />
          <div className="flex-1">{error}</div>
          <button
            onClick={() => setError(null)}
            className="ml-2 p-1 hover:bg-red-100 rounded-full transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center bg-green-50 text-green-600 p-4 rounded-lg text-sm">
          <svg
            className="h-5 w-5 mr-2 flex-shrink-0"
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
          <div className="flex-1">
            Video uploaded successfully! Processing will begin shortly.
            You can view the progress in your dashboard.
          </div>
        </div>
      )}
    </div>
  )
} 