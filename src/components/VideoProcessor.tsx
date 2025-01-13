'use client';

import { useState, useCallback, ChangeEvent, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-hot-toast';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

const MAX_FILE_SIZE = parseInt(process.env.NEXT_PUBLIC_MAX_UPLOAD_SIZE || '50000000', 10);
const SUPPORTED_FORMATS = (process.env.NEXT_PUBLIC_SUPPORTED_VIDEO_FORMATS || 'mp4,mov,avi,mkv').split(',');
const POLLING_INTERVAL = parseInt(process.env.NEXT_PUBLIC_POLLING_INTERVAL || '2000', 10);

interface VideoProcessorProps {
  onProcessingComplete: (shorts: string[]) => void;
}

export function VideoProcessor({ onProcessingComplete }: VideoProcessorProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [processingMessage, setProcessingMessage] = useState('');
  const [isHealthy, setIsHealthy] = useState(false);

  useEffect(() => {
    checkServerHealth();
  }, []);

  const checkServerHealth = async () => {
    try {
      const health = await api.checkHealth();
      setIsHealthy(health.status === 'ok');
    } catch (error) {
      setIsHealthy(false);
      toast.error('Server is not responding. Please try again later.');
    }
  };

  const validateFile = (file: File): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File size must be less than ${MAX_FILE_SIZE / 1000000}MB`);
      return false;
    }

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !SUPPORTED_FORMATS.includes(fileExtension)) {
      toast.error(`Supported formats: ${SUPPORTED_FORMATS.join(', ')}`);
      return false;
    }

    return true;
  };

  const pollTaskStatus = async (taskId: string, onUpdate: (progress: number) => void) => {
    const interval = setInterval(async () => {
      try {
        const status = await api.getTaskStatus(taskId);
        onUpdate(status.progress * 100);
        
        if (status.message) {
          setProcessingMessage(status.message);
        }

        if (status.status === 'completed') {
          clearInterval(interval);
          setIsProcessing(false);
          setProcessingMessage('');
          onProcessingComplete(status.result || []);
        } else if (status.status === 'failed') {
          clearInterval(interval);
          setIsProcessing(false);
          setProcessingMessage('');
          toast.error(status.error || 'Failed to process video');
        }
      } catch (error) {
        clearInterval(interval);
        setIsProcessing(false);
        setProcessingMessage('');
        toast.error('Error checking processing status');
      }
    }, POLLING_INTERVAL);

    return () => clearInterval(interval);
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!isHealthy) {
      toast.error('Server is not responding. Please try again later.');
      return;
    }

    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    if (!validateFile(file)) return;

    try {
      setIsProcessing(true);
      setProgress(10);
      setProcessingMessage('Uploading video...');
      
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.uploadVideo(formData);
      
      setProcessingMessage('Processing video...');
      pollTaskStatus(response.task_id, setProgress);
    } catch (error) {
      setIsProcessing(false);
      setProcessingMessage('');
      // Error is handled by api client
    }
  }, [isHealthy, onProcessingComplete]);

  const processYouTubeUrl = async () => {
    if (!isHealthy) {
      toast.error('Server is not responding. Please try again later.');
      return;
    }

    if (!youtubeUrl) return;

    try {
      setIsProcessing(true);
      setProgress(10);
      setProcessingMessage('Downloading YouTube video...');
      
      const response = await api.processYouTubeVideo({ url: youtubeUrl });
      
      setProcessingMessage('Processing video...');
      pollTaskStatus(response.task_id, setProgress);
    } catch (error) {
      setIsProcessing(false);
      setProcessingMessage('');
      // Error is handled by api client
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': SUPPORTED_FORMATS.map(format => `.${format}`)
    },
    disabled: isProcessing || !isHealthy,
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE
  });

  return (
    <div className="space-y-8">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${(isProcessing || !isHealthy) ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="space-y-4">
          <div className="text-4xl">📁</div>
          <p className="text-lg text-gray-600">
            {isDragActive
              ? 'Drop the video here'
              : 'Drag & drop a video file here, or click to select'}
          </p>
          <p className="text-sm text-gray-500">
            Supports {SUPPORTED_FORMATS.join(', ').toUpperCase()} (Max {MAX_FILE_SIZE / 1000000}MB)
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex gap-4">
          <Input
            type="text"
            placeholder="Or enter a YouTube URL"
            value={youtubeUrl}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setYoutubeUrl(e.target.value)}
            disabled={isProcessing || !isHealthy}
          />
          <Button 
            onClick={processYouTubeUrl}
            disabled={!youtubeUrl || isProcessing || !isHealthy}
          >
            Process
          </Button>
        </div>
      </div>

      {isProcessing && (
        <div className="space-y-2">
          <Progress value={progress} />
          <p className="text-sm text-gray-500 text-center">
            {processingMessage || 'Processing video...'} {Math.round(progress)}%
          </p>
        </div>
      )}

      {!isHealthy && (
        <div className="text-center text-red-500">
          Server is not responding. Please try again later.
          <Button
            onClick={checkServerHealth}
            variant="outline"
            size="sm"
            className="ml-2"
          >
            Retry
          </Button>
        </div>
      )}
    </div>
  );
} 