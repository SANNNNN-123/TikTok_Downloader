from flask import Flask, render_template, request, jsonify, send_file
from flask_caching import Cache
from src.metadata import TikTokMetaData
import pandas as pd
import io
import json
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.DEBUG)

# Configure Flask-Caching
cache = Cache(app, config={'CACHE_TYPE': 'filesystem', 'CACHE_DIR': '/tmp/flask_cache'})

scraper = TikTokMetaData()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/scrape', methods=['POST'])
async def scrape():
    username = request.form['username'].lower()  # Normalize username
    logging.debug(f"Scraping data for username: {username}")
    videos = await scraper.get_user_videos(username)
    if videos:
        # Store in cache
        cache.set(username, videos, timeout=3600)  # Cache for 1 hour
        logging.debug(f"Stored {len(videos)} videos in cache for {username}")
        return jsonify({'success': True, 'message': f'Scraped {len(videos)} videos for @{username}', 'videoCount': len(videos)})
    logging.error(f"Failed to scrape videos for {username}")
    return jsonify({'success': False, 'message': 'Failed to scrape videos'})

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
            download_name=f'{username}_videos.json'
        )
    elif format in ['csv', 'excel']:
        df = pd.DataFrame(data)
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

