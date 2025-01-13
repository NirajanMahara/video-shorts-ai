import axios, { AxiosError } from 'axios';
import { toast } from 'react-hot-toast';

const PYTHON_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const REQUEST_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;

interface ApiError {
  message: string;
  code?: string;
  details?: any;
}

export interface ProcessingTask {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message?: string;
  result?: string[];
  error?: string;
  created_at?: string;
  updated_at?: string;
}

const handleApiError = (error: any): never => {
  const apiError: ApiError = {
    message: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR'
  };

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<any>;
    apiError.message = axiosError.response?.data?.message || axiosError.message;
    apiError.code = axiosError.response?.data?.code || axiosError.code;
    apiError.details = axiosError.response?.data;
  }

  console.error('API Error:', apiError);
  toast.error(apiError.message);
  throw apiError;
};

const axiosInstance = axios.create({
  baseURL: PYTHON_API_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  async uploadVideo(formData: FormData): Promise<ProcessingTask> {
    try {
      const response = await axiosInstance.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));
          console.log(`Upload Progress: ${percentCompleted}%`);
        },
      });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  async processYouTubeVideo(data: { url: string }): Promise<ProcessingTask> {
    try {
      const response = await axiosInstance.post('/youtube', data);
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  async getTaskStatus(taskId: string): Promise<ProcessingTask> {
    if (!taskId) {
      throw new Error('Task ID is required');
    }

    let retries = 0;
    while (retries < MAX_RETRIES) {
      try {
        const response = await axiosInstance.get(`/task/${taskId}`);
        return response.data;
      } catch (error) {
        if (retries === MAX_RETRIES - 1) {
          return handleApiError(error);
        }
        retries++;
        await new Promise(resolve => setTimeout(resolve, 1000 * retries));
      }
    }
    throw new Error('Max retries exceeded');
  },

  async downloadShort(filename: string): Promise<Blob> {
    try {
      const response = await axiosInstance.get(`/download/${filename}`, {
        responseType: 'blob',
        timeout: REQUEST_TIMEOUT * 2, // Double timeout for downloads
      });
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },

  async checkHealth(): Promise<{ status: string }> {
    try {
      const response = await axiosInstance.get('/health');
      return response.data;
    } catch (error) {
      return handleApiError(error);
    }
  },
}; 