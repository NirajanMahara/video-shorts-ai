import os
import logging
import traceback
import shutil
import uuid
from datetime import datetime
from typing import Dict, List, Optional
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from enhanced_video_processor import EnhancedVideoProcessor
from process_youtube import YouTubeProcessor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Initialize processors
youtube_processor = YouTubeProcessor()

# Create directories if they don't exist
os.makedirs("output", exist_ok=True)
os.makedirs("temp", exist_ok=True)

# Initialize FastAPI app
app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Store processing tasks
tasks: Dict[str, dict] = {}

class ProcessingTask(BaseModel):
    task_id: str
    status: str  # 'pending', 'processing', 'completed', 'failed'
    progress: float
    message: str
    result: Optional[List[str]] = None
    error: Optional[str] = None
    created_at: str
    updated_at: str

class YouTubeRequest(BaseModel):
    url: str

def process_video_task(task_id: str, file_path: str):
    """Background task for processing uploaded videos."""
    try:
        # Update task status - Start Processing
        tasks[task_id].update({
            'status': 'processing',
            'progress': 0.1,
            'message': 'Starting video processing',
            'updated_at': datetime.now().isoformat()
        })
        
        logging.info(f"Processing video: {file_path}")
        
        # Initialize processor
        processor = EnhancedVideoProcessor()
        
        # Scene Detection - 25%
        tasks[task_id].update({
            'progress': 0.25,
            'message': 'Detecting scenes',
            'updated_at': datetime.now().isoformat()
        })
        logging.info("Detecting scenes...")
        scenes = processor.detect_scenes(file_path)
        logging.info(f"Found {len(scenes)} scenes")
        
        # Face Detection - 50%
        tasks[task_id].update({
            'progress': 0.50,
            'message': 'Detecting faces',
            'updated_at': datetime.now().isoformat()
        })
        logging.info("Detecting faces...")
        faces = processor.detect_faces(file_path)
        logging.info(f"Found {len(faces)} face events")
        
        # Audio Analysis - 75%
        tasks[task_id].update({
            'progress': 0.75,
            'message': 'Analyzing audio',
            'updated_at': datetime.now().isoformat()
        })
        logging.info("Analyzing audio...")
        audio_analysis = processor.analyze_audio(file_path)
        
        # Generate subtitles - 85%
        tasks[task_id].update({
            'progress': 0.85,
            'message': 'Generating subtitles',
            'updated_at': datetime.now().isoformat()
        })
        logging.info("Generating subtitles...")
        subtitles = processor.generate_subtitles(file_path)
        
        # Create shorts - 90%
        tasks[task_id].update({
            'progress': 0.90,
            'message': 'Creating shorts',
            'updated_at': datetime.now().isoformat()
        })
        
        # Score segments and generate shorts
        logging.info("Scoring segments and generating shorts...")
        segments = processor._score_segments(scenes, faces, audio_analysis, subtitles)
        
        generated_files = []
        total_segments = min(len(segments), 5)  # Generate up to 5 shorts
        
        for i, segment in enumerate(segments[:5], 1):
            progress = 0.90 + (0.10 * (i / total_segments))
            tasks[task_id].update({
                'progress': progress,
                'message': f'Creating short {i}/{total_segments}',
                'updated_at': datetime.now().isoformat()
            })
            
            output_path = os.path.join("output", f"short_{i}.mp4")
            
            # Add relevant subtitles to segment
            segment['subtitles'] = [
                sub for sub in subtitles
                if sub['start'] >= segment['start'] and
                sub['end'] <= segment['start'] + segment['duration']
            ]
            
            # Add attribution metadata
            metadata = {
                'source': 'upload',
                'processed_date': datetime.now().isoformat(),
                'segment_score': segment['score']
            }
            
            if processor.create_short(file_path, output_path, segment, metadata):
                generated_files.append(output_path)
                logging.info(f"Created short {i}: {output_path}")
        
        if generated_files:
            tasks[task_id].update({
                'status': 'completed',
                'progress': 1.0,
                'message': f'Generated {len(generated_files)} shorts',
                'result': [os.path.basename(f) for f in generated_files],
                'updated_at': datetime.now().isoformat()
            })
            logging.info(f"Successfully generated {len(generated_files)} shorts")
        else:
            tasks[task_id].update({
                'status': 'failed',
                'progress': 1.0,
                'message': 'No shorts were generated',
                'error': 'Processing completed but no shorts were generated',
                'updated_at': datetime.now().isoformat()
            })
            logging.warning("No shorts were generated")
            
    except Exception as e:
        logging.error(f"Error processing video: {str(e)}")
        traceback.print_exc()
        tasks[task_id].update({
            'status': 'failed',
            'progress': 1.0,
            'message': 'Processing failed',
            'error': str(e),
            'updated_at': datetime.now().isoformat()
        })
    finally:
        # Clean up
        if os.path.exists(file_path):
            os.remove(file_path)
            logging.info(f"Cleaned up video file: {file_path}")

def process_youtube_task(task_id: str, url: str):
    """Background task for processing YouTube videos."""
    video_path = None
    metadata_path = None
    
    try:
        # Update task status - Start Download
        tasks[task_id].update({
            'status': 'processing',
            'progress': 0.1,
            'message': 'Downloading YouTube video',
            'updated_at': datetime.now().isoformat()
        })
        
        logging.info(f"Downloading video from YouTube: {url}")
        
        # Download video
        video_path = youtube_processor.download_video(url)
        if not video_path:
            raise Exception("Failed to download video")
            
        # Video downloaded - 25%
        tasks[task_id].update({
            'progress': 0.25,
            'message': 'Video downloaded, starting processing',
            'updated_at': datetime.now().isoformat()
        })
        logging.info(f"Downloaded video to: {video_path}")
        
        # Initialize processor
        processor = EnhancedVideoProcessor()
        
        # Scene Detection - 40%
        tasks[task_id].update({
            'progress': 0.4,
            'message': 'Detecting scenes',
            'updated_at': datetime.now().isoformat()
        })
        logging.info("Detecting scenes...")
        scenes = processor.detect_scenes(video_path)
        logging.info(f"Found {len(scenes)} scenes")
        
        # Face Detection - 55%
        tasks[task_id].update({
            'progress': 0.55,
            'message': 'Detecting faces',
            'updated_at': datetime.now().isoformat()
        })
        logging.info("Detecting faces...")
        faces = processor.detect_faces(video_path)
        logging.info(f"Found {len(faces)} face events")
        
        # Audio Analysis - 70%
        tasks[task_id].update({
            'progress': 0.70,
            'message': 'Analyzing audio',
            'updated_at': datetime.now().isoformat()
        })
        logging.info("Analyzing audio...")
        audio_analysis = processor.analyze_audio(video_path)
        
        # Generate subtitles - 85%
        tasks[task_id].update({
            'progress': 0.85,
            'message': 'Generating subtitles',
            'updated_at': datetime.now().isoformat()
        })
        logging.info("Generating subtitles...")
        subtitles = processor.generate_subtitles(video_path)
        
        # Create shorts - 90%
        tasks[task_id].update({
            'progress': 0.90,
            'message': 'Creating shorts',
            'updated_at': datetime.now().isoformat()
        })
        
        # Score segments and generate shorts
        logging.info("Scoring segments and generating shorts...")
        segments = processor._score_segments(scenes, faces, audio_analysis, subtitles)
        
        generated_files = []
        total_segments = min(len(segments), 5)  # Generate up to 5 shorts
        
        for i, segment in enumerate(segments[:5], 1):
            progress = 0.90 + (0.10 * (i / total_segments))
            tasks[task_id].update({
                'progress': progress,
                'message': f'Creating short {i}/{total_segments}',
                'updated_at': datetime.now().isoformat()
            })
            
            output_path = os.path.join("output", f"short_{i}.mp4")
            
            # Add relevant subtitles to segment
            segment['subtitles'] = [
                sub for sub in subtitles
                if sub['start'] >= segment['start'] and
                sub['end'] <= segment['start'] + segment['duration']
            ]
            
            # Add attribution metadata
            metadata = {
                'attribution': f"YouTube: {url}",
                'processed_date': datetime.now().isoformat(),
                'segment_score': segment['score']
            }
            
            if processor.create_short(video_path, output_path, segment, metadata):
                generated_files.append(output_path)
                logging.info(f"Created short {i}: {output_path}")
        
        if generated_files:
            tasks[task_id].update({
                'status': 'completed',
                'progress': 1.0,
                'message': f'Generated {len(generated_files)} shorts',
                'result': [os.path.basename(f) for f in generated_files],
                'updated_at': datetime.now().isoformat()
            })
            logging.info(f"Successfully generated {len(generated_files)} shorts")
        else:
            tasks[task_id].update({
                'status': 'failed',
                'progress': 1.0,
                'message': 'No shorts were generated',
                'error': 'Processing completed but no shorts were generated',
                'updated_at': datetime.now().isoformat()
            })
            logging.warning("No shorts were generated")
            
    except Exception as e:
        logging.error(f"Error processing YouTube video: {str(e)}")
        traceback.print_exc()
        tasks[task_id].update({
            'status': 'failed',
            'progress': 1.0,
            'message': 'Processing failed',
            'error': str(e),
            'updated_at': datetime.now().isoformat()
        })
    finally:
        # Clean up
        if video_path and os.path.exists(video_path):
            os.remove(video_path)
            logging.info(f"Cleaned up video file: {video_path}")
        if metadata_path and os.path.exists(metadata_path):
            os.remove(metadata_path)
            logging.info(f"Cleaned up metadata file: {metadata_path}")

@app.post("/upload", response_model=ProcessingTask)
async def upload_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """Upload and process a video file."""
    # Generate task ID
    task_id = str(uuid.uuid4())
    
    # Initialize task
    tasks[task_id] = {
        'task_id': task_id,
        'status': 'pending',
        'progress': 0.0,
        'message': 'Initializing',
        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat()
    }
    
    try:
        # Save uploaded file
        file_path = os.path.join("temp", file.filename)
        os.makedirs("temp", exist_ok=True)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Start processing in background
        background_tasks.add_task(process_video_task, task_id, file_path)
        
        return ProcessingTask(**tasks[task_id])
        
    except Exception as e:
        logging.error(f"Error uploading video: {str(e)}")
        traceback.print_exc()
        tasks[task_id].update({
            'status': 'failed',
            'progress': 1.0,
            'message': 'Upload failed',
            'error': str(e),
            'updated_at': datetime.now().isoformat()
        })
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/youtube", response_model=ProcessingTask)
async def process_youtube(
    background_tasks: BackgroundTasks,
    request: YouTubeRequest
):
    """Process a YouTube video."""
    # Generate task ID
    task_id = str(uuid.uuid4())
    
    # Initialize task
    tasks[task_id] = {
        'task_id': task_id,
        'status': 'pending',
        'progress': 0.0,
        'message': 'Initializing',
        'created_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat()
    }
    
    try:
        # Start processing in background
        background_tasks.add_task(process_youtube_task, task_id, request.url)
        return ProcessingTask(**tasks[task_id])
        
    except Exception as e:
        logging.error(f"Error processing YouTube video: {str(e)}")
        traceback.print_exc()
        tasks[task_id].update({
            'status': 'failed',
            'progress': 1.0,
            'message': 'Processing failed',
            'error': str(e),
            'updated_at': datetime.now().isoformat()
        })
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/task/{task_id}", response_model=ProcessingTask)
async def get_task_status(task_id: str):
    """Get the status of a processing task."""
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    return ProcessingTask(**tasks[task_id])

@app.get("/download/{filename}")
async def download_video(filename: str):
    """Download a processed video."""
    file_path = os.path.join("output", filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path, media_type="video/mp4", filename=filename)

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    # Run server
    uvicorn.run(app, host="0.0.0.0", port=8000) 