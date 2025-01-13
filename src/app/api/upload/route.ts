import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const PYTHON_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const TEMP_DIR = join(process.cwd(), 'temp');

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const filename = `${uuidv4()}-${file.name}`;
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save file temporarily
    const filePath = join(TEMP_DIR, filename);
    await writeFile(filePath, buffer);

    // Forward to Python API
    const pythonFormData = new FormData();
    pythonFormData.append('file', new Blob([buffer], { type: file.type }), filename);

    const response = await axios.post(`${PYTHON_API_URL}/upload`, pythonFormData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process video' },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
}; 