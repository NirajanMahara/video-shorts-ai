import os
import tempfile
import unittest
from video_processor import VideoProcessor

class TestVideoProcessor(unittest.TestCase):
    def setUp(self):
        """Set up test environment."""
        self.processor = VideoProcessor()
        self.test_dir = tempfile.mkdtemp()
        
        # Create a simple test video
        self.test_video_path = os.path.join(self.test_dir, "test_video.mp4")
        self.create_test_video()
    
    def create_test_video(self):
        """Create a test video using MoviePy."""
        from moviepy.editor import ColorClip, TextClip, CompositeVideoClip
        
        # Create a background
        background = ColorClip(size=(1280, 720), color=(0, 0, 0), duration=10)
        
        # Create some text
        text = TextClip(
            "Test Video",
            fontsize=70,
            color='white',
            size=background.size
        ).set_duration(10)
        
        # Combine clips
        video = CompositeVideoClip([background, text.set_position('center')])
        
        # Write video
        video.write_videofile(
            self.test_video_path,
            fps=30,
            codec='libx264',
            audio=False
        )
    
    def test_scene_detection(self):
        """Test scene detection functionality."""
        scenes = self.processor.detect_scenes(self.test_video_path)
        self.assertIsInstance(scenes, list)
    
    def test_face_detection(self):
        """Test face detection functionality."""
        import cv2
        cap = cv2.VideoCapture(self.test_video_path)
        ret, frame = cap.read()
        cap.release()
        
        if ret:
            faces = self.processor.detect_faces(frame)
            self.assertIsInstance(faces, list)
    
    def test_subtitle_generation(self):
        """Test subtitle generation functionality."""
        subtitles = self.processor.generate_subtitles(self.test_video_path)
        self.assertIsInstance(subtitles, list)
    
    def test_audio_analysis(self):
        """Test audio analysis functionality."""
        peaks = self.processor.analyze_audio_energy(self.test_video_path)
        self.assertIsInstance(peaks, list)
    
    def test_short_creation(self):
        """Test short video creation functionality."""
        output_path = os.path.join(self.test_dir, "test_short.mp4")
        segment = {
            "start": 0,
            "duration": 5
        }
        
        result = self.processor.create_short(
            self.test_video_path,
            output_path,
            segment
        )
        
        self.assertTrue(os.path.exists(output_path))
        self.assertGreater(os.path.getsize(output_path), 0)
    
    def tearDown(self):
        """Clean up test environment."""
        import shutil
        shutil.rmtree(self.test_dir)

if __name__ == '__main__':
    unittest.main() 