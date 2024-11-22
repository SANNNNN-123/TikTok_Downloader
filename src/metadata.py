import yt_dlp
from datetime import datetime
from typing import Optional, List, Dict
import json
import os
import asyncio
import time


class TikTokMetaData:
    """
    A class to scrape TikTok video metadata for a given username.
    """

    def __init__(self):
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Referer': 'https://www.tiktok.com/'
        }
        self.scraped_data = {}

    async def get_user_videos(self, username: str) -> Optional[List[Dict]]:
        """
        Asynchronously fetches a list of video metadata for the specified TikTok username.

        Args:
            username (str): TikTok username (without @ symbol).

        Returns:
            Optional[List[Dict]]: A list of video metadata if successful, None otherwise.
        """
        profile_url = f'https://www.tiktok.com/@{username}'
        ydl_opts = {
            'quiet': True,
            'extract_flat': True,
            'dump_single_json': True,
            'no_warnings': True,
            'no_playlist': True,
            'geo_bypass': True,   
            'ignoreerrors': True,
            'skip_download': True,
            'flat_playlist': True,
            'http_headers': self.headers
        }

        #https://discuss.streamlit.io/t/using-playwright-with-streamlit/28380/2
        #loop = asyncio.ProactorEventLoop()
        #remove
        
        loop = asyncio.get_event_loop()
        start_time = time.time()
        try:
            result = await loop.run_in_executor(None, self._extract_info, profile_url, ydl_opts)

            if result and 'entries' in result:
                videos = result['entries']
                print(f"\nFound {len(videos)} videos for @{username}")

                # Process video metadata
                processed_videos = [
                    self._process_video_metadata(video, username)
                    for video in videos
                ]

                end_time = time.time()
                print(f"Metadata retrieved in {end_time - start_time:.2f} seconds")

                self.scraped_data[username] = processed_videos
                return processed_videos

            return None
        except Exception as e:
            print(f"Error getting user videos: {str(e)}")
            return None

    def _extract_info(self, profile_url: str, ydl_opts: Dict) -> Dict:
        """
        Synchronous helper for yt_dlp extraction.
        """
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            return ydl.extract_info(profile_url, download=False)

    def _process_video_metadata(self, video: Dict, username: str) -> Dict:
        """
        Processes a single video's metadata.

        Args:
            video (Dict): Raw video metadata.
            username (str): TikTok username.

        Returns:
            Dict: Processed video metadata.
        """
        video_id = video.get('id', '')
        return {
            'id': video_id,
            'original_url': f'https://www.tiktok.com/@{username}/video/{video_id}',
            'duration': video.get('duration', 0),
            'title': video.get('title', 'Untitled'),
            'track': video.get('track', 'No Track'),
            'artists': video.get('artist', 'null'),
            'timestamp': self._format_timestamp(video.get('timestamp', 0)),
            'view_count': video.get('view_count', 0),
            'like_count': video.get('like_count', 0),
            'repost_count': video.get('repost_count', 0),
            'comment_count': video.get('comment_count', 0),
            'thumbnail': self._get_second_thumbnail(video.get('thumbnails', [])),
        }

    def _format_timestamp(self, timestamp: int) -> str:
        """
        Converts a Unix timestamp to dd/mm/yy HH:MM:SS format.
        """
        try:
            if timestamp:
                return datetime.fromtimestamp(timestamp).strftime('%d/%m/%y %H:%M:%S')
            return ''
        except Exception:
            return ''

    def _get_second_thumbnail(self, thumbnails: List[Dict]) -> str:
        """
        Retrieves the URL of the second thumbnail, if available.
        """
        try:
            if len(thumbnails) >= 2:
                return thumbnails[1].get('url', '')
            elif len(thumbnails) == 1:
                return thumbnails[0].get('url', '')
            return ''
        except Exception:
            return ''

    # def save_to_json(self,videos: List[Dict], username: str) -> None:
    #     """
    #     Save video metadata to a JSON file
    #     """
    #     # Create 'data' directory if it doesn't exist
    #     os.makedirs('data', exist_ok=True)
        
    #     # Generate filename with timestamp
    #     timestamp = datetime.now().strftime('%Y%m%d')
    #     filename = f'data/{username}_videos_{timestamp}.json'
        
    #     try:
    #         with open(filename, 'w', encoding='utf-8') as f:
    #             json.dump(videos, f, ensure_ascii=False, indent=2)
    #         print(f"\nVideo metadata saved to {filename}")
    #     except Exception as e:
    #         print(f"Error saving JSON file: {str(e)}")


    def load_profile_data(self, username: str):
        return self.scraped_data.get(username)

    # def load_profile_data(self, username: str):
    #     """Load the most recent JSON file for given username"""
    #     today = datetime.now().strftime('%Y%m%d')
    #     filename = f'data/{username}_videos_{today}.json'
        
    #     try:
    #         with open(filename, 'r', encoding='utf-8') as f:
    #             return json.load(f)
    #     except FileNotFoundError:
    #         # Try to find most recent file for username if today's doesn't exist
    #         data_dir = 'data'
    #         if os.path.exists(data_dir):
    #             files = [f for f in os.listdir(data_dir) if f.startswith(f'{username}_videos_')]
    #             if files:
    #                 # Get most recent file
    #                 latest_file = max(files)
    #                 with open(os.path.join(data_dir, latest_file), 'r', encoding='utf-8') as f:
    #                     return json.load(f)
    #     return None