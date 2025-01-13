import os
from video_processor import VideoProcessor
from dotenv import load_dotenv
import cv2

load_dotenv()

def test_video_processor():
    """Test video processor functionality."""
    try:
        print("Initializing video processor...")
        processor = VideoProcessor()
        print("✓ Video processor initialized")

        # Test video path
        test_video = "test-video.mp4"
        if not os.path.exists(test_video):
            print(f"❌ Test video not found at: {test_video}")
            return False
        
        print(f"\nUsing test video: {test_video}")
        cap = cv2.VideoCapture(test_video)
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps
        print(f"Video info:")
        print(f"- Duration: {duration:.2f} seconds")
        print(f"- Frames: {total_frames}")
        print(f"- FPS: {fps}")
        cap.release()

        # Test scene detection
        print("\nTesting scene detection...")
        scenes = processor.detect_scenes(test_video)
        print(f"✓ Scene detection found {len(scenes)} scenes")
        if scenes:
            print("Scene timestamps:")
            for i, timestamp in enumerate(scenes, 1):
                print(f"  {i}. {timestamp:.2f}s")

        # Test face detection (on first 100 frames only)
        print("\nTesting face detection (limited frames)...")
        cap = cv2.VideoCapture(test_video)
        frame_count = 0
        closeups = []
        
        while frame_count < 100:  # Only test first 100 frames
            ret, frame = cap.read()
            if not ret:
                break
            
            if frame_count % 10 == 0:  # Only process every 10th frame
                print(f"\nProcessing frame {frame_count}...")
                # Convert BGR to RGB
                rgb_frame = frame[:, :, ::-1]
                # Find faces
                face_locations = processor.face_detector.face_locations(rgb_frame)
                print(f"Found {len(face_locations)} faces")
                
                # Check face sizes
                frame_area = frame.shape[0] * frame.shape[1]
                for face_location in face_locations:
                    top, right, bottom, left = face_location
                    face_area = (bottom - top) * (right - left)
                    face_ratio = face_area / frame_area
                    print(f"Face size: {face_area}px², Ratio: {face_ratio:.3f}")
                    if face_ratio > processor.face_threshold:
                        closeups.append({"frame": frame_count, "face_ratio": face_ratio})
            
            frame_count += 1
        
        cap.release()
        print(f"\n✓ Face detection found {len(closeups)} closeups in first {frame_count} frames")
        if closeups:
            print("Closeup details:")
            for i, closeup in enumerate(closeups, 1):
                print(f"  {i}. Frame {closeup['frame']}, Ratio: {closeup['face_ratio']:.3f}")

        # Test audio analysis
        print("\nTesting audio analysis...")
        peaks = processor.analyze_audio_energy(test_video)
        print(f"✓ Audio analysis found {len(peaks)} energy peaks")
        if peaks:
            print("Audio peak timestamps:")
            for i, timestamp in enumerate(peaks[:10], 1):  # Show first 10 peaks
                print(f"  {i}. {timestamp:.2f}s")

        print("\nAll tests completed!")
        return True

    except Exception as e:
        print(f"\n❌ Error during testing: {str(e)}")
        return False

if __name__ == "__main__":
    test_video_processor() 