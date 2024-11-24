from flask import Flask, render_template, request, jsonify, send_file
from src.metadata import TikTokMetaData
from src.scraper import get_user_info
from src.analytics import get_top_videos
from src.database import get_db,init_db, Video,get_cached_user_data,store_user_data
import pandas as pd
import logging
import asyncio
from dotenv import load_dotenv

app = Flask(__name__)
logging.basicConfig(level=logging.DEBUG)

scraper = TikTokMetaData()

@app.route('/')
@app.route('/search')
def index():
    return render_template('search.html')

@app.route('/overview')
def overview():
    return render_template('overview.html')

@app.route('/analytics')
def analytics():
    return render_template('analytics.html')

@app.route('/download')
def download_page():
    return render_template('download.html')


@app.route('/api/search', methods=['POST'])
async def scrape():
    username = request.form['name'].lower().lstrip('@')  # Normalize username
    logging.debug(f"Finding data for username: {username}")

    try:
        # Check cache first
        cached_profile, cached_videos = await get_cached_user_data(username)

        if cached_profile and cached_videos:
            return jsonify({
                'status': 'success',
                'message': f'Found {len(cached_videos)} videos from @{username}',
                'profile': cached_profile,
                'source': 'cache'
            })
        
        # If not in cache, fetch new data
        # Run both scraping functions concurrently
        logging.debug(f"Fetching new data for {username}")
        user_info_task = asyncio.create_task(get_user_info(username))
        videos_task = asyncio.create_task(scraper.get_user_videos(username))
        
        profile_data, videos_data = await asyncio.gather(user_info_task, videos_task)

        if profile_data and videos_data:
            # Store data in database
            await store_user_data(username, profile_data, videos_data)
        
            logging.debug(f"Stored user info and {len(videos_data)} videos in database for {username}")
            return jsonify({
                'status': 'success',
                'message': f'Successfully fetched data for @{username}',
                'profile': profile_data,
                'source': 'fresh'
            })

        else:
            # Neither user info nor videos exist (user doesn't exist)
            logging.error(f"User {username} does not exist")
            return jsonify({
                'success': False,
                'message': 'The user does not exist.'
            })
    except Exception as e:
        print(f"Error analyzing profile: {e}") 
        return jsonify({'status': 'error', 'message': f'Error analyzing profile: {str(e)}'}), 500


if __name__ == '__main__':
    init_db()
    app.run(debug=True)

