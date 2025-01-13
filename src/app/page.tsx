'use client';

import { useState } from 'react';
import { VideoProcessor } from '@/components/VideoProcessor';
import { toast, Toaster } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';

export default function Home() {
  const [generatedShorts, setGeneratedShorts] = useState<string[]>([]);

  const handleProcessingComplete = (shorts: string[]) => {
    console.log('Generated shorts:', shorts);
    setGeneratedShorts(shorts);
    
    if (shorts.length > 0) {
      toast.success(`Successfully generated ${shorts.length} shorts!`);
    } else {
      toast.error('No shorts were generated');
    }
  };

  const handleDownload = async (filename: string) => {
    try {
      const blob = await api.downloadShort(filename);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast.error('Failed to download short');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto py-12 px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Video Shorts Generator
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Upload your video or provide a YouTube URL to automatically generate
            engaging short-form content with AI-powered scene detection, face
            tracking, and audio analysis.
          </p>
        </div>

        <VideoProcessor onProcessingComplete={handleProcessingComplete} />

        {generatedShorts.length > 0 && (
          <div className="mt-8 p-6 bg-white rounded-lg shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Generated Shorts</h2>
            <div className="space-y-4">
              {generatedShorts.map((filename, index) => (
                <div key={filename} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <span className="text-gray-700">Short {index + 1}</span>
                  <div className="space-x-4">
                    <Button
                      className="bg-white hover:bg-gray-100 text-gray-800"
                      onClick={() => handleDownload(filename)}
                    >
                      Download
                    </Button>
                    <Button
                      className="bg-white hover:bg-gray-100 text-gray-800"
                      onClick={() => window.open(`/api/download/${filename}`, '_blank')}
                    >
                      Preview
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <Toaster 
        position="bottom-right"
        toastOptions={{
          duration: 5000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#4ade80',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </main>
  );
}
