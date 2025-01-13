import cv2
import numpy as np
import face_recognition
from moviepy.editor import VideoFileClip, TextClip, CompositeVideoClip
from pydub import AudioSegment
import whisper
from scipy.signal import find_peaks
import torch
from transformers import pipeline
import os
from typing import List, Dict, Tuple
import traceback

class VideoProcessor:
    def __init__(self):
        # Initialize models
        self.face_detector = face_recognition
        self.audio_model = whisper.load_model("base")
        
        # Scene Detection Settings
        self.scene_threshold = 45.0  # Reduced from 30.0 to catch more subtle scene changes
        self.min_scene_duration = 1.0  # Minimum 1 second between scenes
        
        # Face Detection Settings
        self.face_threshold = 0.015  # Reduced from 0.2 to 0.015 (1.5% of frame)
        self.face_detection_interval = 5  # Process every 5th frame
        self.min_face_pixels = 1000  # Minimum face size in pixels
        
        # Audio Settings
        self.audio_threshold = 0.3  # Lowered from 0.7 to detect more peaks
        self.min_audio_duration = 0.5  # Minimum duration between audio peaks
        
        print("Initialized with optimized settings:")
        print("Scene Detection:")
        print(f"- Scene threshold: {self.scene_threshold}")
        print(f"- Min scene duration: {self.min_scene_duration}s")
        print("Face Detection:")
        print(f"- Face threshold: {self.face_threshold}")
        print(f"- Detection interval: every {self.face_detection_interval} frames")
        print(f"- Min face size: {self.min_face_pixels}px²")
        print("Audio Analysis:")
        print(f"- Audio threshold: {self.audio_threshold}")
        print(f"- Min audio duration: {self.min_audio_duration}s")

    def detect_scenes(self, video_path: str) -> List[float]:
        """Detect scene changes in video."""
        try:
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                raise ValueError("Could not open video file")

            fps = cap.get(cv2.CAP_PROP_FPS)
            scenes = []
            prev_frame = None
            frame_count = 0
            min_frames_between_scenes = int(fps * self.min_scene_duration)
            last_scene_frame = -min_frames_between_scenes
            
            # For calculating average scene score
            scene_scores = []

            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                # Resize frame for faster processing
                frame = cv2.resize(frame, (640, 360))

                if prev_frame is not None:
                    # Calculate frame difference
                    diff = cv2.absdiff(frame, prev_frame)
                    score = np.mean(diff)
                    scene_scores.append(score)

                    # Use adaptive thresholding based on recent scores
                    local_threshold = self.scene_threshold
                    if len(scene_scores) > 30:  # Use last 1 second of scores
                        recent_mean = np.mean(scene_scores[-30:])
                        local_threshold = max(self.scene_threshold, recent_mean * 1.5)

                    if score > local_threshold and (frame_count - last_scene_frame) >= min_frames_between_scenes:
                        timestamp = frame_count / fps
                        scenes.append(timestamp)
                        last_scene_frame = frame_count
                        print(f"Scene detected at {timestamp:.2f}s (score: {score:.2f}, threshold: {local_threshold:.2f})")

                prev_frame = frame.copy()
                frame_count += 1

            cap.release()
            print(f"Total frames processed: {frame_count}")
            if scene_scores:
                print(f"Average scene score: {np.mean(scene_scores):.2f}")
                print(f"Max scene score: {np.max(scene_scores):.2f}")
            return scenes
        except Exception as e:
            print(f"Error in scene detection: {str(e)}")
            return []

    def find_closeups(self, video_path: str) -> List[Dict]:
        """Find face closeups in video."""
        try:
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                raise ValueError("Could not open video file")

            fps = cap.get(cv2.CAP_PROP_FPS)
            closeups = []
            frame_count = 0
            last_closeup_frame = -int(fps)  # Minimum 1 second between closeups

            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                # Process frames at specified interval
                if frame_count % self.face_detection_interval == 0:
                    # Resize frame for faster processing while maintaining aspect ratio
                    height, width = frame.shape[:2]
                    max_dimension = 720
                    if height > max_dimension or width > max_dimension:
                        scale = max_dimension / max(height, width)
                        frame = cv2.resize(frame, (int(width * scale), int(height * scale)))
                    
                    # Convert BGR to RGB
                    rgb_frame = frame[:, :, ::-1]
                    
                    # Find faces
                    face_locations = self.face_detector.face_locations(rgb_frame)
                    print(f"Frame {frame_count}: Found {len(face_locations)} faces")
                    
                    # Check if any face takes up significant portion of frame
                    frame_area = frame.shape[0] * frame.shape[1]
                    for face_location in face_locations:
                        top, right, bottom, left = face_location
                        face_area = (bottom - top) * (right - left)
                        face_ratio = face_area / frame_area
                        
                        # Only process faces above minimum size
                        if face_area >= self.min_face_pixels:
                            print(f"Face size: {face_area}px², Ratio: {face_ratio:.3f}")
                            
                            if face_ratio > self.face_threshold and (frame_count - last_closeup_frame) >= int(fps):
                                timestamp = frame_count / fps
                                closeups.append({
                                    "timestamp": timestamp,
                                    "face_ratio": face_ratio,
                                    "face_area": face_area
                                })
                                last_closeup_frame = frame_count
                                print(f"Closeup detected at {timestamp:.2f}s (ratio: {face_ratio:.3f})")

                frame_count += 1

            cap.release()
            print(f"Processed {frame_count} frames, found {len(closeups)} closeups")
            return closeups
        except Exception as e:
            print(f"Error in face detection: {str(e)}")
            return []

    def analyze_audio_energy(self, video_path: str) -> List[float]:
        """Analyze audio energy levels using pydub."""
        try:
            # First extract audio from video using moviepy
            video = VideoFileClip(video_path)
            temp_audio_path = "temp_audio.wav"
            video.audio.write_audiofile(temp_audio_path)
            video.close()

            # Load audio with pydub
            audio = AudioSegment.from_wav(temp_audio_path)
            
            # Convert to numpy array
            samples = np.array(audio.get_array_of_samples())
            
            # Convert to mono if stereo
            if audio.channels == 2:
                samples = samples.reshape((-1, 2)).mean(axis=1)
            
            # Normalize audio
            samples = samples / np.max(np.abs(samples))
            
            # Calculate energy using rolling window
            window_size = int(audio.frame_rate * 0.1)  # 100ms window
            if window_size == 0:
                window_size = 1
            
            # Calculate energy for each window
            n_windows = len(samples) // window_size
            energy = np.array([
                np.mean(np.abs(samples[i*window_size:(i+1)*window_size]))
                for i in range(n_windows)
            ])
            
            # Find peaks with minimum distance
            min_distance = max(1, int(self.min_audio_duration * audio.frame_rate / window_size))
            peaks, properties = find_peaks(
                energy,
                height=self.audio_threshold,
                distance=min_distance
            )
            
            # Convert peak indices to timestamps
            timestamps = (peaks * window_size) / audio.frame_rate
            
            # Print debug info
            print(f"Audio analysis:")
            print(f"- Sample rate: {audio.frame_rate}Hz")
            print(f"- Duration: {len(samples)/audio.frame_rate:.2f}s")
            print(f"- Channels: {audio.channels}")
            print(f"- Total samples: {len(samples)}")
            print(f"- Window size: {window_size}")
            print(f"- Energy windows: {len(energy)}")
            if len(peaks) > 0:
                print(f"- Peak heights: {properties['peak_heights'].tolist()}")
                print(f"- Peak timestamps: {timestamps.tolist()}")
            
            # Clean up temporary file
            os.remove(temp_audio_path)
            
            return timestamps.tolist()
        except Exception as e:
            print(f"Error in audio analysis: {str(e)}")
            traceback.print_exc()
            return []

    def create_short(
        self,
        input_path: str,
        output_path: str,
        segment: Dict,
        add_subtitles: bool = True,
        add_effects: bool = True
    ) -> bool:
        """Create a short video segment with optional effects and subtitles."""
        try:
            print(f"Loading video: {input_path}")
            # Load video with specific settings
            video = VideoFileClip(input_path)
            
            # Extract segment
            start = segment["start"]
            duration = segment["duration"]
            print(f"Extracting segment: {start:.2f}s to {start + duration:.2f}s")
            
            # Ensure we don't exceed video duration
            end_time = min(start + duration, video.duration)
            clip = video.subclip(start, end_time)
            
            # Maintain original resolution
            original_size = (video.size[0], video.size[1])
            clip = clip.resize(original_size)
            
            # Add subtitles if enabled
            if add_subtitles:
                try:
                    print("Extracting audio for transcription...")
                    # Extract audio for the segment
                    audio_file = "temp_audio.wav"
                    clip.audio.write_audiofile(audio_file, verbose=False, logger=None)
                    
                    print("Transcribing audio...")
                    # Transcribe audio
                    result = self.audio_model.transcribe(audio_file)
                    
                    # Create subtitle clips
                    subtitle_clips = []
                    for segment in result["segments"]:
                        text = segment["text"]
                        t_start = segment["start"]
                        t_end = segment["end"]
                        
                        try:
                            # Create subtitle with better visibility
                            txt_clip = (TextClip(text, 
                                               fontsize=32, 
                                               color='white',
                                               stroke_color='black',
                                               stroke_width=2,
                                               font='Arial-Bold',
                                               size=(clip.w * 0.8, None),
                                               method='caption')
                                      .set_start(t_start)
                                      .set_duration(t_end - t_start)
                                      .set_position(('center', 'bottom')))
                            
                            subtitle_clips.append(txt_clip)
                        except Exception as e:
                            print(f"Warning: Failed to create subtitle for text: {text}")
                            print(f"Error: {str(e)}")
                            continue
                    
                    # Composite video with subtitles
                    if subtitle_clips:
                        print(f"Adding {len(subtitle_clips)} subtitle clips...")
                        clip = CompositeVideoClip([clip] + subtitle_clips)
                    
                    # Clean up
                    os.remove(audio_file)
                except Exception as e:
                    print(f"Warning: Failed to add subtitles: {str(e)}")
                    # Continue without subtitles
            
            # Add effects if enabled
            if add_effects:
                try:
                    print("Adding effects...")
                    # Add fade in/out
                    clip = clip.fadein(0.5).fadeout(0.5)
                except Exception as e:
                    print(f"Warning: Failed to add effects: {str(e)}")
            
            # Write output with high quality settings
            print(f"Writing output to: {output_path}")
            clip.write_videofile(
                output_path,
                codec='libx264',
                audio_codec='aac',
                bitrate="4000k",  # Higher bitrate for better quality
                audio_bitrate="192k",  # Better audio quality
                fps=30,  # Maintain good frame rate
                preset='medium',  # Balance between quality and encoding speed
                threads=4,  # Use multiple threads for faster processing
                verbose=False,
                logger=None
            )
            
            # Clean up
            video.close()
            clip.close()
            
            # Verify the output file size
            if os.path.exists(output_path):
                file_size = os.path.getsize(output_path) / (1024 * 1024)  # Size in MB
                print(f"Generated file size: {file_size:.2f}MB")
                if file_size < 0.1:  # If file is too small, something went wrong
                    print("Warning: Output file is suspiciously small!")
                    return False
            
            return True
        except Exception as e:
            print(f"Error creating short: {str(e)}")
            traceback.print_exc()
            return False 