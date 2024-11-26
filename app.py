from flask import Flask, render_template, request, jsonify
from src.metadata import TikTokMetaData
from src.scraper import get_user_info
from src.analytics import get_top_videos,get_trends_data,get_performance_data,get_active_days_data,get_duration_analysis,get_Engagement_data,get_user_info_fromdb,download_fromdb
from src.database import init_db, Video,get_cached_user_data,store_user_data
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

@app.route('/download/', defaults={'username': None}, methods=['GET'])
@app.route('/download/<username>', methods=['GET', 'POST'])
def download_page(username):
    if request.method == 'GET':
        return render_template('download.html', username=username)
    
    if not username:
        return jsonify({'error': 'Username is required'}), 400
        
    format = request.form.get('format')
    if not format:
        return jsonify({'error': 'Format is required'}), 400
        
    try:
        return download_fromdb(username, format)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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
        
        # First check if user exists
        logging.debug(f"Checking if user {username} exists")
        profile_data = await get_user_info(username)

        if not profile_data:
            logging.error(f"User {username} does not exist")
            return jsonify({
                'status': 'error',
                'message': 'This user does not exist.',
                'exists': False
            })

        # User exists, now try to fetch videos
        logging.debug(f"User exists, fetching videos for {username}")
        videos_data = await scraper.get_user_videos(username)

        # Check if we can access videos
        if videos_data:
            # Store complete data in database
            await store_user_data(username, profile_data, videos_data)
        
            logging.debug(f"Stored user info and {len(videos_data)} videos in database for {username}")
            return jsonify({
                'status': 'success',
                'message': f'Successfully fetched data for @{username}',
                'profile': profile_data,
                'source': 'fresh'
            })
        else:
            # Profile exists but no videos (private profile)
            logging.warning(f"User {username} exists but profile is private")
            return jsonify({
                'status': 'error',
                'message': 'This profile is private.',
                'profile': profile_data,
                'isPrivate': True
            })

    except Exception as e:
        print(f"Error analyzing profile: {e}") 
        return jsonify({
            'status': 'error', 
            'message': f'Error analyzing profile: {str(e)}'
        }), 500
    
@app.route('/api/overview/<username>')
def get_overview_data(username):
    try:
        # Get profile data
        profile_response = get_user_info_fromdb(username)
        profile_data = profile_response.json
 
        # Get trends data
        trends_response = get_trends_data(username)
        trends_data = trends_response.json

        # Get top videos
        videos_response = get_top_videos(username)
        videos_data = videos_response.json  

        # Get performance data
        performance_response = get_performance_data(username)
        performance_data = performance_response.json

        # Get active days
        activedays_response = get_active_days_data(username)
        activedays_data = activedays_response.json

        # Get duration analysis
        duration_response = get_duration_analysis(username)
        duration_data = duration_response.json

        # Get engagement data
        engagement_response = get_Engagement_data(username)
        engagement_data = engagement_response.json

        response_data = {
            'status': 'success',
            'user_info': profile_data['user_info']['profile_data'],
            'trends': trends_data,
            'topVideos': videos_data,
            'performance_stats' : performance_data,
            'active_days' : activedays_data,
            'duration_breakdown' : duration_data,
            'engagement_section' : engagement_data,

        }
        return jsonify(response_data)
        
    except Exception as e:
        return jsonify({'status': 'error','message': str(e)}), 500


if __name__ == '__main__':
    init_db()
    app.run(debug=True)

