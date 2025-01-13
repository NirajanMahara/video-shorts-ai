import cv2
import numpy as np
import face_recognition
from moviepy.editor import VideoFileClip, TextClip, CompositeVideoClip, ColorClip, concatenate_videoclips
from pydub import AudioSegment
import whisper
from scipy.signal import find_peaks
import torch
from transformers import pipeline
import os
from typing import List, Dict, Tuple, Optional
import traceback
import librosa
from PIL import Image, ImageDraw, ImageFont
import json
from datetime import datetime
import logging

class EnhancedVideoProcessor:
    def __init__(self, config: Optional[Dict] = None):
        """Initialize the enhanced video processor with configurable settings."""
        self.config = {
            # Scene Detection
            'scene_threshold': 45.0,
            'min_scene_duration': 1.0,
            
            # Face Detection
            'face_threshold': 0.015,
            'face_detection_interval': 5,
            'min_face_pixels': 1000,
            
            # Audio Analysis
            'audio_threshold': 0.3,
            'min_audio_duration': 0.5,
            'audio_window_size': 0.1,
            
            # Content Settings
            'min_segment_duration': 10.0,
            'max_segment_duration': 60.0,
            'target_short_duration': 15.0,
            
            # Output Settings
            'output_width': 1080,
            'output_height': 1920,
            'fps': 30,
            'video_bitrate': '4000k',
            'audio_bitrate': '192k',
            
            # Effects
            'transition_duration': 0.5,
            'subtitle_fontsize': 32,
            'watermark_opacity': 0.8,
            
            # Processing
            'temp_dir': 'temp',
            'output_dir': 'output'
        }
        
        if config:
            self.config.update(config)
            
        # Initialize models
        self.setup_models()
        self.setup_directories()
        self.setup_logging()
        
    def setup_models(self):
        """Initialize AI models and detectors."""
        try:
            # Face detection
            self.face_detector = face_recognition
            
            # Audio transcription
            self.audio_model = whisper.load_model("base")
            
            # Sentiment analysis for captions
            self.sentiment_analyzer = pipeline("sentiment-analysis")
            
            # Text summarization
            self.summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
            
            logging.info("All models initialized successfully")
        except Exception as e:
            logging.error(f"Error initializing models: {str(e)}")
            raise
            
    def setup_directories(self):
        """Create necessary directories."""
        for dir_name in [self.config['temp_dir'], self.config['output_dir']]:
            os.makedirs(dir_name, exist_ok=True)
            
    def setup_logging(self):
        """Configure logging."""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('video_processor.log'),
                logging.StreamHandler()
            ]
        )

    def detect_scenes(self, video_path: str) -> List[float]:
        """
        Enhanced scene detection using multiple metrics.
        Returns list of scene change timestamps.
        """
        try:
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                raise ValueError("Could not open video file")

            fps = cap.get(cv2.CAP_PROP_FPS)
            scenes = []
            prev_frame = None
            frame_count = 0
            min_frames_between_scenes = int(fps * self.config['min_scene_duration'])
            last_scene_frame = -min_frames_between_scenes
            
            # For calculating average scene score
            scene_scores = []
            
            # Histogram comparison parameters
            h_bins = 50
            s_bins = 60
            histSize = [h_bins, s_bins]
            h_ranges = [0, 180]
            s_ranges = [0, 256]
            ranges = h_ranges + s_ranges
            channels = [0, 1]

            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                # Resize frame for faster processing
                frame = cv2.resize(frame, (640, 360))
                
                if prev_frame is not None:
                    # Calculate multiple metrics
                    
                    # 1. Absolute difference
                    diff = cv2.absdiff(frame, prev_frame)
                    score_diff = np.mean(diff)
                    
                    # 2. Histogram comparison
                    hsv_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
                    hsv_prev = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2HSV)
                    
                    hist_frame = cv2.calcHist([hsv_frame], channels, None, histSize, ranges)
                    hist_prev = cv2.calcHist([hsv_prev], channels, None, histSize, ranges)
                    
                    score_hist = cv2.compareHist(hist_frame, hist_prev, cv2.HISTCMP_CORREL)
                    
                    # 3. Optical flow
                    prev_gray = cv2.cvtColor(prev_frame, cv2.COLOR_BGR2GRAY)
                    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                    flow = cv2.calcOpticalFlowFarneback(prev_gray, gray, None, 0.5, 3, 15, 3, 5, 1.2, 0)
                    score_flow = np.mean(np.abs(flow))
                    
                    # Combine scores
                    combined_score = score_diff * (1 - score_hist) * score_flow
                    scene_scores.append(combined_score)
                    
                    # Adaptive thresholding
                    local_threshold = self.config['scene_threshold']
                    if len(scene_scores) > 30:
                        recent_mean = np.mean(scene_scores[-30:])
                        local_threshold = max(self.config['scene_threshold'], recent_mean * 1.5)

                    if combined_score > local_threshold and (frame_count - last_scene_frame) >= min_frames_between_scenes:
                        timestamp = frame_count / fps
                        scenes.append({
                            'timestamp': timestamp,
                            'score': combined_score,
                            'metrics': {
                                'difference': score_diff,
                                'histogram': score_hist,
                                'optical_flow': score_flow
                            }
                        })
                        last_scene_frame = frame_count
                        logging.info(f"Scene detected at {timestamp:.2f}s (score: {combined_score:.2f})")

                prev_frame = frame.copy()
                frame_count += 1

            cap.release()
            logging.info(f"Scene detection complete: {len(scenes)} scenes found")
            return scenes
            
        except Exception as e:
            logging.error(f"Error in scene detection: {str(e)}")
            traceback.print_exc()
            return []

    def detect_faces(self, video_path: str) -> List[Dict]:
        """
        Enhanced face detection with improved metrics and tracking.
        Returns list of face detection events.
        """
        try:
            cap = cv2.VideoCapture(video_path)
            if not cap.isOpened():
                raise ValueError("Could not open video file")

            fps = cap.get(cv2.CAP_PROP_FPS)
            face_events = []
            frame_count = 0
            last_face_frame = -int(fps)
            
            # Face tracking variables
            face_trackers = []
            next_face_id = 0

            while True:
                ret, frame = cap.read()
                if not ret:
                    break

                # Process frames at specified interval
                if frame_count % self.config['face_detection_interval'] == 0:
                    # Resize frame while maintaining aspect ratio
                    height, width = frame.shape[:2]
                    max_dimension = 720
                    if height > max_dimension or width > max_dimension:
                        scale = max_dimension / max(height, width)
                        frame = cv2.resize(frame, (int(width * scale), int(height * scale)))
                    
                    # Convert BGR to RGB
                    rgb_frame = frame[:, :, ::-1]
                    
                    # Detect faces
                    face_locations = self.face_detector.face_locations(rgb_frame)
                    face_encodings = self.face_detector.face_encodings(rgb_frame, face_locations)
                    
                    # Update face trackers
                    current_faces = []
                    frame_area = frame.shape[0] * frame.shape[1]
                    
                    for face_location, face_encoding in zip(face_locations, face_encodings):
                        top, right, bottom, left = face_location
                        face_area = (bottom - top) * (right - left)
                        face_ratio = face_area / frame_area
                        
                        if face_area >= self.config['min_face_pixels']:
                            # Try to match with existing faces
                            matched = False
                            for tracker in face_trackers:
                                if np.linalg.norm(face_encoding - tracker['encoding']) < 0.6:
                                    tracker.update({
                                        'location': face_location,
                                        'area': face_area,
                                        'ratio': face_ratio,
                                        'last_seen': frame_count
                                    })
                                    current_faces.append(tracker)
                                    matched = True
                                    break
                            
                            # If no match, create new tracker
                            if not matched:
                                new_tracker = {
                                    'id': next_face_id,
                                    'first_seen': frame_count,
                                    'last_seen': frame_count,
                                    'location': face_location,
                                    'encoding': face_encoding,
                                    'area': face_area,
                                    'ratio': face_ratio
                                }
                                face_trackers.append(new_tracker)
                                current_faces.append(new_tracker)
                                next_face_id += 1
                    
                    # Record significant face events
                    for face in current_faces:
                        if face['ratio'] > self.config['face_threshold'] and \
                           (frame_count - last_face_frame) >= int(fps):
                            timestamp = frame_count / fps
                            face_events.append({
                                'timestamp': timestamp,
                                'face_id': face['id'],
                                'duration': (face['last_seen'] - face['first_seen']) / fps,
                                'face_ratio': face['ratio'],
                                'face_area': face['area']
                            })
                            last_face_frame = frame_count
                            logging.info(f"Face closeup detected at {timestamp:.2f}s (ratio: {face['ratio']:.3f})")

                frame_count += 1

            cap.release()
            logging.info(f"Face detection complete: {len(face_events)} events found")
            return face_events
            
        except Exception as e:
            logging.error(f"Error in face detection: {str(e)}")
            traceback.print_exc()
            return []

    def analyze_audio(self, video_path: str) -> Dict:
        """
        Enhanced audio analysis using multiple audio features.
        Returns dict with various audio metrics and events.
        """
        try:
            # Extract audio using moviepy
            video = VideoFileClip(video_path)
            temp_audio_path = os.path.join(self.config['temp_dir'], "temp_audio.wav")
            video.audio.write_audiofile(temp_audio_path, verbose=False, logger=None)
            
            # Load audio with librosa for advanced analysis
            y, sr = librosa.load(temp_audio_path)
            
            # Calculate multiple audio features
            
            # 1. Energy/amplitude envelope
            hop_length = int(sr * self.config['audio_window_size'])
            energy = librosa.feature.rms(y=y, hop_length=hop_length)[0]
            
            # 2. Spectral centroid (brightness)
            spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
            
            # 3. Onset detection (sudden changes/beats)
            onset_env = librosa.onset.onset_strength(y=y, sr=sr)
            onset_frames = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr)
            onset_times = librosa.frames_to_time(onset_frames, sr=sr)
            
            # 4. Pitch detection
            pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
            
            # Find significant moments using combined features
            significant_moments = []
            
            # Normalize features
            energy_norm = (energy - np.mean(energy)) / np.std(energy)
            centroids_norm = (spectral_centroids - np.mean(spectral_centroids)) / np.std(spectral_centroids)
            
            # Combine features and find peaks
            combined_feature = energy_norm + 0.5 * centroids_norm
            peaks, properties = find_peaks(
                combined_feature,
                height=self.config['audio_threshold'],
                distance=int(self.config['min_audio_duration'] * sr / hop_length)
            )
            
            # Convert peaks to timestamps and gather metrics
            for peak, height in zip(peaks, properties['peak_heights']):
                timestamp = librosa.frames_to_time(peak, sr=sr, hop_length=hop_length)
                significant_moments.append({
                    'timestamp': timestamp,
                    'intensity': float(height),
                    'energy': float(energy[peak]),
                    'spectral_centroid': float(spectral_centroids[peak])
                })
            
            # Clean up
            os.remove(temp_audio_path)
            
            # Return comprehensive audio analysis
            return {
                'significant_moments': significant_moments,
                'onset_times': onset_times.tolist(),
                'average_energy': float(np.mean(energy)),
                'energy_std': float(np.std(energy)),
                'average_brightness': float(np.mean(spectral_centroids)),
                'num_onsets': len(onset_times)
            }
            
        except Exception as e:
            logging.error(f"Error in audio analysis: {str(e)}")
            traceback.print_exc()
            return {'significant_moments': [], 'onset_times': []}

    def generate_subtitles(self, video_path: str) -> List[Dict]:
        """
        Enhanced subtitle generation with sentiment analysis and styling.
        Returns list of subtitle events with timing and style information.
        """
        try:
            # Extract audio for transcription
            video = VideoFileClip(video_path)
            temp_audio_path = os.path.join(self.config['temp_dir'], "temp_audio.wav")
            video.audio.write_audiofile(temp_audio_path, verbose=False, logger=None)
            
            # Transcribe audio
            result = self.audio_model.transcribe(temp_audio_path)
            
            # Process each segment with enhanced features
            subtitle_events = []
            
            for segment in result["segments"]:
                # Basic subtitle info
                text = segment["text"]
                start_time = segment["start"]
                end_time = segment["end"]
                
                # Analyze sentiment
                sentiment = self.sentiment_analyzer(text)[0]
                
                # Summarize long text
                if len(text.split()) > 20:
                    summary = self.summarizer(text, max_length=10, min_length=5)[0]['summary_text']
                else:
                    summary = text
                
                # Calculate optimal position and style based on content
                position = 'bottom'
                if len(text) > 50:  # Long text goes at the bottom
                    position = 'bottom'
                elif any(char.isupper() for char in text):  # Emphasized text goes at top
                    position = 'top'
                
                # Determine style based on sentiment
                style = {
                    'fontsize': self.config['subtitle_fontsize'],
                    'color': 'white',
                    'stroke_color': 'black',
                    'stroke_width': 2,
                }
                
                if sentiment['label'] == 'POSITIVE':
                    style['color'] = '#00ff00'  # Green for positive
                elif sentiment['label'] == 'NEGATIVE':
                    style['color'] = '#ff0000'  # Red for negative
                
                subtitle_events.append({
                    'text': text,
                    'summary': summary,
                    'start': start_time,
                    'end': end_time,
                    'position': position,
                    'style': style,
                    'sentiment': sentiment
                })
            
            # Clean up
            os.remove(temp_audio_path)
            
            logging.info(f"Generated {len(subtitle_events)} subtitle events")
            return subtitle_events
            
        except Exception as e:
            logging.error(f"Error in subtitle generation: {str(e)}")
            traceback.print_exc()
            return []

    def create_short(
        self,
        input_path: str,
        output_path: str,
        segment: Dict,
        metadata: Optional[Dict] = None
    ) -> bool:
        """
        Create an enhanced short video with advanced effects and branding.
        """
        try:
            logging.info(f"Creating short video: {output_path}")
            
            # Load video
            video = VideoFileClip(input_path)
            
            # Extract segment
            start = segment['start']
            duration = min(segment['duration'], video.duration - start)
            clip = video.subclip(start, start + duration)
            
            # Resize for vertical format if needed
            target_aspect = self.config['output_height'] / self.config['output_width']
            current_aspect = clip.h / clip.w
            
            if current_aspect < target_aspect:
                # Horizontal video needs vertical cropping
                new_w = int(clip.h / target_aspect)
                x_center = clip.w / 2
                clip = clip.crop(x_center=(x_center), width=new_w)
            
            # Resize to target resolution
            clip = clip.resize((self.config['output_width'], self.config['output_height']))
            
            # Add transitions
            if self.config['transition_duration'] > 0:
                clip = clip.fadein(self.config['transition_duration'])
                clip = clip.fadeout(self.config['transition_duration'])
            
            # Add subtitles if available
            if 'subtitles' in segment:
                subtitle_clips = []
                for subtitle in segment['subtitles']:
                    txt_clip = (TextClip(
                        subtitle['text'],
                        fontsize=subtitle['style']['fontsize'],
                        color=subtitle['style']['color'],
                        stroke_color=subtitle['style']['stroke_color'],
                        stroke_width=subtitle['style']['stroke_width'],
                        font='Arial-Bold',
                        size=(clip.w * 0.8, None),
                        method='caption'
                    )
                    .set_start(subtitle['start'] - start)
                    .set_duration(subtitle['end'] - subtitle['start'])
                    .set_position(subtitle['position']))
                    
                    subtitle_clips.append(txt_clip)
                
                if subtitle_clips:
                    clip = CompositeVideoClip([clip] + subtitle_clips)
            
            # Add watermark/branding
            if metadata and 'attribution' in metadata:
                attribution_text = f"Original: {metadata['attribution']}"
                watermark = (TextClip(
                    attribution_text,
                    fontsize=20,
                    color='white',
                    stroke_color='black',
                    stroke_width=1,
                    font='Arial'
                )
                .set_opacity(self.config['watermark_opacity'])
                .set_duration(clip.duration)
                .set_position(('center', 'bottom')))
                
                clip = CompositeVideoClip([clip, watermark])
            
            # Write output with high quality settings
            clip.write_videofile(
                output_path,
                codec='libx264',
                audio_codec='aac',
                bitrate=self.config['video_bitrate'],
                audio_bitrate=self.config['audio_bitrate'],
                fps=self.config['fps'],
                preset='medium',
                threads=4,
                verbose=False,
                logger=None
            )
            
            # Clean up
            video.close()
            clip.close()
            
            # Verify output
            if os.path.exists(output_path):
                file_size = os.path.getsize(output_path) / (1024 * 1024)  # Size in MB
                logging.info(f"Generated file size: {file_size:.2f}MB")
                if file_size < 0.1:
                    logging.warning("Output file is suspiciously small!")
                    return False
                return True
            
            return False
            
        except Exception as e:
            logging.error(f"Error creating short: {str(e)}")
            traceback.print_exc()
            return False

    def process_video(self, input_path: str, output_dir: str = None) -> List[str]:
        """
        Process a video and generate multiple shorts with optimal content selection.
        """
        try:
            if output_dir is None:
                output_dir = self.config['output_dir']
            
            os.makedirs(output_dir, exist_ok=True)
            
            # Analyze video components
            scenes = self.detect_scenes(input_path)
            faces = self.detect_faces(input_path)
            audio_analysis = self.analyze_audio(input_path)
            subtitles = self.generate_subtitles(input_path)
            
            # Score and rank segments
            segments = self._score_segments(scenes, faces, audio_analysis, subtitles)
            
            # Generate shorts for top segments
            generated_files = []
            for i, segment in enumerate(segments[:5], 1):  # Generate top 5 shorts
                output_path = os.path.join(output_dir, f"short_{i}.mp4")
                
                # Add relevant subtitles to segment
                segment['subtitles'] = [
                    sub for sub in subtitles
                    if sub['start'] >= segment['start'] and
                    sub['end'] <= segment['start'] + segment['duration']
                ]
                
                # Add attribution metadata
                metadata = {
                    'attribution': os.path.basename(input_path),
                    'processed_date': datetime.now().isoformat(),
                    'segment_score': segment['score']
                }
                
                if self.create_short(input_path, output_path, segment, metadata):
                    generated_files.append(output_path)
                    logging.info(f"Successfully created short {i}: {output_path}")
                
            return generated_files
            
        except Exception as e:
            logging.error(f"Error in video processing: {str(e)}")
            traceback.print_exc()
            return []

    def _score_segments(
        self,
        scenes: List[Dict],
        faces: List[Dict],
        audio_analysis: Dict,
        subtitles: List[Dict]
    ) -> List[Dict]:
        """
        Score and rank video segments based on multiple features.
        """
        segments = []
        video_features = {
            'scenes': scenes,
            'faces': faces,
            'audio': audio_analysis['significant_moments'],
            'subtitles': subtitles
        }
        
        # Create initial segments from scene changes
        for i, scene in enumerate(scenes):
            start = scene['timestamp']
            
            # Determine segment duration
            if i < len(scenes) - 1:
                duration = scenes[i + 1]['timestamp'] - start
            else:
                duration = self.config['target_short_duration']
            
            # Adjust duration to target range
            duration = min(max(duration, self.config['min_segment_duration']),
                         self.config['max_segment_duration'])
            
            # Calculate feature scores
            face_score = sum(1 for f in faces if
                           start <= f['timestamp'] <= start + duration)
            
            audio_score = sum(1 for m in audio_analysis['significant_moments'] if
                            start <= m['timestamp'] <= start + duration)
            
            subtitle_score = sum(1 for s in subtitles if
                               start <= s['start'] <= start + duration)
            
            # Combined score with weights
            total_score = (
                scene['score'] * 0.3 +
                face_score * 0.3 +
                audio_score * 0.2 +
                subtitle_score * 0.2
            )
            
            segments.append({
                'start': start,
                'duration': duration,
                'score': total_score,
                'features': {
                    'scene_score': scene['score'],
                    'face_count': face_score,
                    'audio_events': audio_score,
                    'subtitle_count': subtitle_score
                }
            })
        
        # Sort segments by score
        segments.sort(key=lambda x: x['score'], reverse=True)
        
        return segments 