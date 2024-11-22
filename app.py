from flask import Flask, render_template, request, jsonify, send_file
from src.metadata import TikTokMetaData
import pandas as pd
import json
import io
from collections import OrderedDict
import logging


app = Flask(__name__)
scraper = TikTokMetaData()

# In-memory cache with OrderedDict to limit its size
logging.basicConfig(level=logging.DEBUG)
cache = OrderedDict()
MAX_CACHE_SIZE = 100  # Adjust this value based on your needs


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
        cache[username] = videos
        logging.debug(f"Stored {len(videos)} videos in cache for {username}")
        # Limit cache size
        if len(cache) > MAX_CACHE_SIZE:
            oldest = next(iter(cache))
            del cache[oldest]
            logging.debug(f"Removed oldest entry from cache: {oldest}")
        return jsonify({'success': True, 'message': f'Scraped {len(videos)} videos for @{username}', 'videoCount': len(videos)})
    logging.error(f"Failed to scrape videos for {username}")
    return jsonify({'success': False, 'message': 'Failed to scrape videos'})

@app.route('/download/<format>')
def download(format):
    username = request.args.get('username', '').lower()  # Normalize username
    logging.debug(f"Attempting to download data for username: {username}")
    logging.debug(f"Current cache keys: {list(cache.keys())}")
    data = cache.get(username)
   
    #data = scraper.load_profile_data(username)
    
    if not data:
        return jsonify({'success': False, 'message': 'No data found for this username'})
    
    if format == 'json':
        return send_file(io.BytesIO(json.dumps(data).encode()), 
                         mimetype='application/json',
                         as_attachment=True,
                         download_name=f'{username}_metadata_videos.json')
    elif format in ['csv', 'excel']:
        df = pd.DataFrame(data)
        output = io.BytesIO()
        if format == 'csv':
            df.to_csv(output, index=False)
            mimetype = 'text/csv'
            download_name = f'{username}_metadata_videos.csv'
        else:
            df.to_excel(output, index=False)
            mimetype = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            download_name = f'{username}_metadata_videos.xlsx'
        output.seek(0)
        return send_file(output, 
                         mimetype=mimetype,
                         as_attachment=True,
                         download_name=download_name)
    
    return jsonify({'success': False, 'message': 'Invalid format'})


if __name__ == '__main__':
    app.run(debug=True)


