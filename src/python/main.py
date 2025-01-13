from fastapi import FastAPI, File, UploadFile, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import os
import json
import boto3
from typing import Dict
from video_processor import VideoProcessor

app = FastAPI()
processor = VideoProcessor()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize S3 client
BUCKET_NAME = os.getenv('AWS_BUCKET_NAME', 'video-shorts')
s3 = boto3.client(
    's3',
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    region_name=os.getenv('AWS_REGION', 'us-east-1')
)

@app.get("/")
async def root():
    return {
        "status": "ok",
        "message": "Video processing API is running"
    }

@app.get("/test-video-processor")
async def test_video_processor():
    try:
        return {
            "status": "ok",
            "message": "Video processor initialized successfully",
            "features": {
                "scene_detection": True,
                "face_detection": True,
                "audio_analysis": True,
                "captions": True
            }
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Error initializing video processor: {str(e)}"
        }

def process_video_background(video_path: str, video_id: str, settings: Dict):
    """Background task for video processing."""
    try:
        # Update status to processing
        update_status(video_id, "PROCESSING")
        
        # Detect scenes
        scenes = processor.detect_scenes(video_path)
        
        # Find closeups if enabled
        closeups = []
        if settings.get('enableFaceDetection'):
            closeups = processor.find_closeups(video_path)
        
        # Analyze audio if enabled
        audio_peaks = []
        if settings.get('enableAudioAnalysis'):
            audio_peaks = processor.analyze_audio_energy(video_path)
        
        # Generate segments
        segments = []
        for scene in scenes:
            # Check if scene has closeup
            has_closeup = any(abs(c["timestamp"] - scene) < 2.0 for c in closeups)
            # Check if scene has audio peak
            has_audio_peak = any(abs(peak - scene) < 2.0 for peak in audio_peaks)
            
            if has_closeup or has_audio_peak:
                segments.append({
                    "start": scene,
                    "duration": settings.get('segmentDuration', 15.0),
                    "has_closeup": has_closeup,
                    "has_audio_peak": has_audio_peak
                })
        
        # Process top segments
        processed_segments = []
        for i, segment in enumerate(segments[:settings.get('maxSegments', 5)]):
            output_path = f"temp/segment_{video_id}_{i}.mp4"
            
            # Create short with effects and subtitles
            processor.create_short(
                video_path,
                output_path,
                segment,
                add_subtitles=settings.get('enableCaptions', True),
                add_effects=settings.get('enableDynamicEffects', True)
            )
            
            # Upload to S3
            s3_key = f"shorts/{video_id}/segment_{i}.mp4"
            s3.upload_file(output_path, BUCKET_NAME, s3_key)
            url = f"https://{BUCKET_NAME}.s3.{os.getenv('AWS_REGION')}.amazonaws.com/{s3_key}"
            
            processed_segments.append({
                **segment,
                "url": url
            })
            
            # Cleanup local file
            os.remove(output_path)
        
        # Save metadata
        metadata = {
            "video_id": video_id,
            "segments": processed_segments,
            "scenes": scenes,
            "closeups": closeups,
            "audio_peaks": audio_peaks
        }
        
        # Upload metadata to S3
        s3_key = f"metadata/{video_id}.json"
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=s3_key,
            Body=json.dumps(metadata),
            ContentType='application/json'
        )
        
        # Update status to completed
        update_status(video_id, "COMPLETED", metadata)
        
    except Exception as e:
        print(f"Error processing video: {str(e)}")
        update_status(video_id, "FAILED", {"error": str(e)})
    finally:
        # Clean up input file
        try:
            os.remove(video_path)
        except Exception as e:
            print(f"Error cleaning up input file: {str(e)}")

def update_status(video_id: str, status: str, metadata: Dict = None):
    """Update processing status in S3."""
    s3_key = f"status/{video_id}.json"
    status_data = {
        "status": status,
        "metadata": metadata
    }
    s3.put_object(
        Bucket=BUCKET_NAME,
        Key=s3_key,
        Body=json.dumps(status_data),
        ContentType='application/json'
    )

@app.post("/process")
async def process_video(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    segmentDuration: int = 15,
    enableSceneDetection: bool = True,
    enableFaceDetection: bool = True,
    enableAudioAnalysis: bool = True,
    enableCaptions: bool = False,
    enableFilters: bool = False,
    enableDynamicEffects: bool = True,
    selectedFilter: str = "none",
    minSegmentLength: int = 10,
    maxSegments: int = 5,
    captionStyle: str = "standard",
    transitionStyle: str = "fade"
):
    """Process uploaded video and generate shorts."""
    try:
        # Create temporary directories
        os.makedirs("temp", exist_ok=True)
        
        # Save uploaded file
        video_id = os.urandom(16).hex()
        video_path = f"temp/{video_id}.mp4"
        
        with open(video_path, "wb") as buffer:
            buffer.write(await file.read())
        
        # Collect settings from form fields
        settings = {
            "segmentDuration": segmentDuration,
            "enableSceneDetection": enableSceneDetection,
            "enableFaceDetection": enableFaceDetection,
            "enableAudioAnalysis": enableAudioAnalysis,
            "enableCaptions": enableCaptions,
            "enableFilters": enableFilters,
            "enableDynamicEffects": enableDynamicEffects,
            "selectedFilter": selectedFilter,
            "minSegmentLength": minSegmentLength,
            "maxSegments": maxSegments,
            "captionStyle": captionStyle,
            "transitionStyle": transitionStyle
        }
        
        # Start background processing
        background_tasks.add_task(
            process_video_background,
            video_path,
            video_id,
            settings
        )
        
        return {
            "status": "processing",
            "video_id": video_id,
            "message": "Video processing started"
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

@app.get("/status/{video_id}")
async def get_status(video_id: str):
    """Get processing status and results for a video."""
    try:
        s3_key = f"status/{video_id}.json"
        response = s3.get_object(Bucket=BUCKET_NAME, Key=s3_key)
        status_data = json.loads(response['Body'].read())
        return status_data
    except s3.exceptions.NoSuchKey:
        return {
            "status": "processing",
            "message": "Video is still being processed"
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 