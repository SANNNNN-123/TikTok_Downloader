from flask import Flask, render_template, request, jsonify, send_file
from src.metadata import TikTokMetaData
import pandas as pd
import asyncio
import os
import json
import io
import yt_dlp

app = Flask(__name__)
scraper = TikTokMetaData()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/scrape', methods=['POST'])
async def scrape():
    username = request.form['username']
    videos = await scraper.get_user_videos(username)
    if videos:
        return jsonify({'success': True, 'message': f'Scraped {len(videos)} videos for @{username}', 'videoCount': len(videos)})
    return jsonify({'success': False, 'message': 'Failed to scrape videos'})

@app.route('/download/<format>')
def download(format):
    username = request.args.get('username')
    data = scraper.load_profile_data(username)
    
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


