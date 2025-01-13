import { NextResponse } from 'next/server';
import axios from 'axios';

const PYTHON_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: 'No YouTube URL provided' },
        { status: 400 }
      );
    }

    // Forward to Python API
    const response = await axios.post(`${PYTHON_API_URL}/youtube`, { url });
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('YouTube processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process YouTube video' },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: true,
  },
}; 