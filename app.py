from flask import Flask, render_template, request, jsonify, send_file
from flask_caching import Cache
from src.metadata import TikTokMetaData
from src.scraper import get_user_info
import pandas as pd
import io
import json
import logging
import asyncio

app = Flask(__name__)
logging.basicConfig(level=logging.DEBUG)

# Configure Flask-Caching
cache = Cache(app, config={'CACHE_TYPE': 'filesystem', 'CACHE_DIR': '/tmp/flask_cache'})

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
#@app.route('/scrape', methods=['POST'])
async def scrape():
    username = request.form['name'].lower()  # Normalize username
    logging.debug(f"Scraping data for username: {username}")

    # Run both scraping functions concurrently
    user_info_task = asyncio.create_task(get_user_info(username))
    videos_task = asyncio.create_task(scraper.get_user_videos(username))

    user_info, videos = await asyncio.gather(user_info_task, videos_task)

    if user_info and videos:
        # Both user info and videos exist
        data = {
            'user_info': user_info,
            'videos': videos
        }
        # Store in cache
        cache.set(username, data, timeout=3600)  # Cache for 1 hour
        logging.debug(f"Stored user info and {len(videos)} videos in cache for {username}")
        return jsonify({
            'success': True,
            'message': f'Found {len(videos)} videos from @{username}',
            'videoCount': len(videos),
            'userInfo': user_info
        })
    elif user_info and not videos:
        # User exists but no videos (private profile)
        logging.info(f"Profile is private for {username}")
        return jsonify({
            'success': False,
            'message': 'This user has a private profile, and no data is available.'
        })
    else:
        # Neither user info nor videos exist (user doesn't exist)
        logging.error(f"User {username} does not exist")
        return jsonify({
            'success': False,
            'message': 'The user does not exist.'
        })

@app.route('/download/<format>')
def download(format):
    username = request.args.get('username', '').lower()  # Normalize username
    logging.debug(f"Attempting to download data for username: {username}")
    data = cache.get(username)
    
    if not data:
        logging.error(f"No data found in cache for username: {username}")
        return jsonify({'success': False, 'message': 'No data found for this username'})
    
    logging.debug(f"Found data in cache for {username}, preparing {format} file")
    
    if format == 'json':
        return send_file(
            io.BytesIO(json.dumps(data, indent=2).encode()),
            mimetype='application/json',
            as_attachment=True,
            download_name=f'{username}_data.json'
        )
    elif format in ['csv', 'excel']:
        df = pd.DataFrame(data['videos'])
        output = io.BytesIO()
        if format == 'csv':
            df.to_csv(output, index=False)
            mimetype = 'text/csv'
            download_name = f'{username}_videos.csv'
        else:
            df.to_excel(output, index=False, engine='openpyxl')
            mimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            download_name = f'{username}_videos.xlsx'
        output.seek(0)
        return send_file(
            output,
            mimetype=mimetype,
            as_attachment=True,
            download_name=download_name
        )
    
    logging.error(f"Invalid format requested: {format}")
    return jsonify({'success': False, 'message': 'Invalid format'})

if __name__ == '__main__':
    app.run(debug=True)

