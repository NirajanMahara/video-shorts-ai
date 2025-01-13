import os
import argparse
from pytube import YouTube
from enhanced_video_processor import EnhancedVideoProcessor
import logging
from typing import Optional, List, Dict
import json
from datetime import datetime

class YouTubeProcessor:
    def __init__(self, output_dir: str = "output", temp_dir: str = "temp"):
        """Initialize YouTube video processor."""
        self.output_dir = output_dir
        self.temp_dir = temp_dir
        self.processor = EnhancedVideoProcessor({
            'output_dir': output_dir,
            'temp_dir': temp_dir
        })
        os.makedirs(output_dir, exist_ok=True)
        os.makedirs(temp_dir, exist_ok=True)
        
    def download_video(self, url: str) -> Optional[str]:
        """Download YouTube video and return path to downloaded file."""
        try:
            # Create YouTube object
            yt = YouTube(url)
            
            # Get video metadata
            metadata = {
                'title': yt.title,
                'author': yt.author,
                'length': yt.length,
                'views': yt.views,
                'rating': yt.rating,
                'description': yt.description
            }
            
            # Save metadata
            metadata_path = os.path.join(self.temp_dir, f"{yt.video_id}_metadata.json")
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            # Get highest quality progressive stream
            stream = yt.streams.filter(progressive=True, file_extension='mp4').order_by('resolution').desc().first()
            
            if not stream:
                logging.error("No suitable video stream found")
                return None
            
            # Download video
            logging.info(f"Downloading video: {yt.title}")
            video_path = stream.download(output_path=self.temp_dir)
            logging.info(f"Downloaded to: {video_path}")
            
            return video_path
            
        except Exception as e:
            logging.error(f"Error downloading video: {str(e)}")
            return None
            
    def process_video(self, video_path: str, metadata_path: Optional[str] = None) -> List[str]:
        """Process downloaded video and generate shorts."""
        try:
            # Load metadata if available
            metadata = None
            if metadata_path and os.path.exists(metadata_path):
                with open(metadata_path, 'r') as f:
                    metadata = json.load(f)
            
            # Process video
            shorts = self.processor.process_video(video_path, self.output_dir)
            
            # Save processing results
            results = {
                'input_video': video_path,
                'metadata': metadata,
                'shorts_generated': shorts,
                'processing_date': datetime.now().isoformat()
            }
            
            results_path = os.path.join(self.output_dir, "processing_results.json")
            with open(results_path, 'w') as f:
                json.dump(results, f, indent=2)
            
            return shorts
            
        except Exception as e:
            logging.error(f"Error processing video: {str(e)}")
            return []
            
    def process_youtube_video(self, url: str) -> List[str]:
        """Download and process a YouTube video."""
        try:
            # Download video
            video_path = self.download_video(url)
            if not video_path:
                return []
                
            # Get metadata path
            video_id = YouTube(url).video_id
            metadata_path = os.path.join(self.temp_dir, f"{video_id}_metadata.json")
            
            # Process video
            shorts = self.process_video(video_path, metadata_path)
            
            # Clean up
            if os.path.exists(video_path):
                os.remove(video_path)
            if os.path.exists(metadata_path):
                os.remove(metadata_path)
                
            return shorts
            
        except Exception as e:
            logging.error(f"Error processing YouTube video: {str(e)}")
            return []

def main():
    # Set up argument parser
    parser = argparse.ArgumentParser(description='Process YouTube videos into shorts')
    parser.add_argument('url', help='YouTube video URL to process')
    parser.add_argument('--output-dir', default='output', help='Output directory for generated shorts')
    parser.add_argument('--temp-dir', default='temp', help='Temporary directory for downloads')
    
    # Parse arguments
    args = parser.parse_args()
    
    # Set up logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )
    
    # Process video
    processor = YouTubeProcessor(args.output_dir, args.temp_dir)
    shorts = processor.process_youtube_video(args.url)
    
    # Print results
    if shorts:
        print("\nGenerated shorts:")
        for i, short in enumerate(shorts, 1):
            print(f"{i}. {short}")
    else:
        print("No shorts were generated")

if __name__ == "__main__":
    main() 