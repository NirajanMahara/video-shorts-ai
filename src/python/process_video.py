from video_processor import VideoProcessor
import os
from typing import List, Dict
import cv2

def process_complete_video(
    video_path: str,
    output_dir: str = "output",
    segment_duration: float = 15.0,
    max_segments: int = 5
) -> List[Dict]:
    """Process a complete video and generate shorts."""
    
    try:
        # Initialize processor
        processor = VideoProcessor()
        
        # Create output directory
        os.makedirs(output_dir, exist_ok=True)
        
        # Get video duration
        cap = cv2.VideoCapture(video_path)
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        video_duration = total_frames / fps
        cap.release()
        
        # Adjust segment duration if longer than video
        if segment_duration > video_duration:
            segment_duration = video_duration
            print(f"Adjusted segment duration to video length: {segment_duration:.2f}s")
        
        print(f"\nProcessing video: {video_path}")
        print(f"Video duration: {video_duration:.2f}s")
        print("1. Detecting scenes...")
        scenes = processor.detect_scenes(video_path)
        
        print("\n2. Finding face closeups...")
        closeups = processor.find_closeups(video_path)
        
        print("\n3. Analyzing audio...")
        audio_peaks = processor.analyze_audio_energy(video_path)
        
        # Combine all interesting moments
        interesting_moments = []
        
        # Add scenes
        for timestamp in scenes:
            interesting_moments.append({
                "timestamp": timestamp,
                "type": "scene_change",
                "score": 1.0
            })
        
        # Add closeups
        for closeup in closeups:
            interesting_moments.append({
                "timestamp": closeup["timestamp"],
                "type": "face_closeup",
                "score": closeup["face_ratio"]
            })
        
        # Add audio peaks
        for timestamp in audio_peaks:
            interesting_moments.append({
                "timestamp": timestamp,
                "type": "audio_peak",
                "score": 1.0
            })
        
        # Sort by timestamp
        interesting_moments.sort(key=lambda x: x["timestamp"])
        
        # Group nearby moments (within 2 seconds)
        grouped_moments = []
        current_group = None
        
        for moment in interesting_moments:
            if current_group is None:
                current_group = {
                    "start": moment["timestamp"],
                    "types": [moment["type"]],
                    "score": moment["score"]
                }
            elif moment["timestamp"] - current_group["start"] <= 2.0:
                current_group["types"].append(moment["type"])
                current_group["score"] += moment["score"]
            else:
                grouped_moments.append(current_group)
                current_group = {
                    "start": moment["timestamp"],
                    "types": [moment["type"]],
                    "score": moment["score"]
                }
        
        if current_group:
            grouped_moments.append(current_group)
        
        # Sort groups by score
        grouped_moments.sort(key=lambda x: x["score"], reverse=True)
        
        # Take top N segments
        segments_to_process = grouped_moments[:max_segments]
        
        print(f"\nGenerating {len(segments_to_process)} shorts...")
        generated_segments = []
        
        for i, segment in enumerate(segments_to_process):
            output_path = os.path.join(output_dir, f"short_{i+1}.mp4")
            print(f"\nCreating short {i+1}/{len(segments_to_process)}:")
            print(f"- Start time: {segment['start']:.2f}s")
            print(f"- Features: {', '.join(segment['types'])}")
            print(f"- Score: {segment['score']:.2f}")
            
            # Ensure segment doesn't exceed video duration
            start_time = max(0, segment["start"] - 0.5)  # Start 0.5s before
            available_duration = video_duration - start_time
            actual_duration = min(segment_duration, available_duration)
            
            success = processor.create_short(
                video_path,
                output_path,
                {
                    "start": start_time,
                    "duration": actual_duration
                },
                add_subtitles=True,
                add_effects=True
            )
            
            if success:
                print(f"✓ Created: {output_path}")
                generated_segments.append({
                    "path": output_path,
                    "start": start_time,
                    "duration": actual_duration,
                    "features": segment["types"],
                    "score": segment["score"]
                })
            else:
                print(f"✗ Failed to create: {output_path}")
        
        print(f"\nProcessing complete! Generated {len(generated_segments)} shorts.")
        return generated_segments
        
    except Exception as e:
        print(f"Error processing video: {str(e)}")
        return []

if __name__ == "__main__":
    # Process test video
    video_path = "test-video.mp4"
    if not os.path.exists(video_path):
        print(f"Error: Test video not found at {video_path}")
        exit(1)
    
    segments = process_complete_video(
        video_path,
        output_dir="output",
        segment_duration=15.0,  # Will be automatically adjusted to video length
        max_segments=5
    ) 