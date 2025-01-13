from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
        # Import and test video processor
        from video_processor import VideoProcessor
        processor = VideoProcessor()
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 