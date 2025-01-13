import { NextResponse } from 'next/server';
import axios from 'axios';

const PYTHON_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function GET(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    const { taskId } = params;

    if (!taskId) {
      return NextResponse.json(
        { error: 'No task ID provided' },
        { status: 400 }
      );
    }

    // Forward to Python API
    const response = await axios.get(`${PYTHON_API_URL}/task/${taskId}`);
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Task status error:', error);
    return NextResponse.json(
      { error: 'Failed to get task status' },
      { status: 500 }
    );
  }
} 