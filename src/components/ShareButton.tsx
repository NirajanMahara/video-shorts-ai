'use client'

import { useState } from 'react'
import { Share2, Check, Copy } from 'lucide-react'

interface ShareButtonProps {
  url: string
  title?: string
  className?: string
}

export default function ShareButton({ url, title, className = '' }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || 'Check out this video',
          url: url,
        })
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          copyToClipboard()
        }
      }
    } else {
      copyToClipboard()
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setShowTooltip(true)
      setTimeout(() => {
        setCopied(false)
        setShowTooltip(false)
      }, 2000)
    })
  }

  return (
    <div className="relative">
      <button
        onClick={handleShare}
        className={`inline-flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${className}`}
      >
        {copied ? (
          <Check className="h-4 w-4 mr-2" />
        ) : (
          <Share2 className="h-4 w-4 mr-2" />
        )}
        Share
      </button>
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded">
          Copied!
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      )}
    </div>
  )
} 