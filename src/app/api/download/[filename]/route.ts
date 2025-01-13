import { NextResponse } from 'next/server';
import axios from 'axios';

const PYTHON_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function GET(
  request: Request,
  { params }: { params: { filename: string } }
) {
  try {
    const response = await axios.get(`${PYTHON_API_URL}/download/${params.filename}`, {
      responseType: 'arraybuffer',
    });

    const headers = new Headers();
    headers.set('Content-Type', 'video/mp4');
    headers.set('Content-Disposition', `attachment; filename="${params.filename}"`);

    return new NextResponse(response.data, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Failed to download video' },
      { status: 500 }
    );
  }
} 