import plotly
import plotly.graph_objs as go
from flask import jsonify
from src.database import get_db, Video
from datetime import datetime,timedelta
import json


def get_top_videos(username):
    try:
        db = next(get_db())

        videos = db.query(Video)\
            .filter(Video.username == username)\
            .all()
            
        if not videos:
            return jsonify({
                'status': 'error',
                'message': 'No videos found for the user'
            }), 404
            
        # Process videos and sort by views
        processed_videos = []
        for video in videos:
            video_data = video.video_metadata 
            processed_videos.append({
                'id': video_data.get('id', ''),
                'thumbnail': video_data.get('thumbnail', ''),
                'title': video_data.get('title', ''),
                'views': int(video_data.get('view_count', 0)),
                'like_count': int(video_data.get('like_count', 0)),
                'comment_count': int(video_data.get('comment_count', 0)),
                'shares': int(video_data.get('repost_count', 0)),
                'original_url': video_data.get('original_url', '')
            })
        
        # Sort by views and get top 3
        top_videos = sorted(processed_videos, key=lambda x: x['like_count'], reverse=True)[:3]
        
        return jsonify({
            'status': 'success',
            'videos': top_videos
        })
        
    except Exception as e:
        return jsonify({'status': 'error','message': str(e)}), 500
    finally:
        db.close()

def get_trends_data(username):
    try:
        db = next(get_db())
        
        # Query the database for the user's videos
        videos = db.query(Video)\
            .filter(Video.username == username)\
            .all()

        if not videos:
            return jsonify({
                'status': 'error',
                'message': 'No data found for the specified user'
            }), 404

        # Filter and process videos
        monthly_data = {}
        min_date = None
        for video in videos:
            try:
                timestamp_str = video.video_metadata.get('timestamp')

                if timestamp_str:
                    # Parse timestamp
                    for fmt in ['%d/%m/%y %H:%M:%S', '%Y-%m-%d %H:%M:%S', '%Y-%m-%dT%H:%M:%S']:
                        try:
                            timestamp = datetime.strptime(timestamp_str, fmt)
                            break
                        except ValueError:
                            continue
                    else:
                        continue
                else:
                    continue

                # Update min_date for calculating the full range of months
                if min_date is None or timestamp < min_date:
                    min_date = timestamp

                # Group data by month
                month_key = timestamp.strftime('%Y-%m')  # YYYY-MM for sorting
                if month_key not in monthly_data:
                    monthly_data[month_key] = {'views': 0, 'likes': 0}

                monthly_data[month_key]['views'] += int(video.video_metadata.get('view_count', 0))
                monthly_data[month_key]['likes'] += int(video.video_metadata.get('like_count', 0))

            except Exception:
                continue

        # Ensure min_date is valid
        if min_date is None:
            return jsonify({
                'status': 'error',
                'message': 'No valid video data found'
            }), 404

        # Generate full list of months from min_date to today
        current_date = datetime.now()
        all_months = []
        while min_date <= current_date:
            all_months.append(min_date.strftime('%Y-%m'))
            min_date += timedelta(days=32)  # Add ~1 month
            min_date = datetime(min_date.year, min_date.month, 1)  # Reset to the first of the next month

        # Prepare data for the graph
        views = [monthly_data.get(month, {}).get('views', 0) for month in all_months]
        likes = [monthly_data.get(month, {}).get('likes', 0) for month in all_months]
        months = [datetime.strptime(month, '%Y-%m').strftime('%b-%y') for month in all_months]  # Convert to MMM-YY

        if not months:
            return jsonify({
                'status': 'error',
                'message': 'No valid data points found'
            }), 404
        
        # Determine the range for the last 12 months
        if len(months) > 12:
            initial_x_range = months[-12:]
        else:
            initial_x_range = months 

        # Find the maximum count for y-axis
        max_y_value = max(max(views, default=0), max(likes, default=0))

        # Create the Plotly figure
        fig = go.Figure()
        
        # Add traces for views and likes
        fig.add_trace(go.Scatter(
            x=months,
            y=views,
            name='Views',
            mode='lines+markers',
            line=dict(color='#00f2ea', width=2),
            marker=dict(size=6),
            fill='tonexty',
            fillcolor='rgba(0, 242, 234, 0.1)'
        ))
        
        fig.add_trace(go.Scatter(
            x=months,
            y=likes,
            name='Likes',
            mode='lines+markers',
            line=dict(color='#ff0050', width=2),
            marker=dict(size=6),
            fill='tonexty',
            fillcolor='rgba(255, 0, 80, 0.1)'
        ))
        
        # Update layout
        fig.update_layout(
            plot_bgcolor='white',
            paper_bgcolor='white',
            margin=dict(l=40, r=20, t=60, b=40),
            hovermode='x unified',
            xaxis=dict(
                title='Month',
                showgrid=False,
                showline=True,
                linecolor='rgba(0,0,0,0.1)',
                tickangle=-50,
                tickmode='array',
                tickvals=months,
                ticktext=months,
                range=[months.index(initial_x_range[0]), months.index(initial_x_range[-1])]
            ),
            yaxis=dict(
                showticklabels=False,
                showgrid=True,
                gridcolor='rgba(0,0,0,0.1)',
                showline=True,
                linecolor='rgba(0,0,0,0.1)',
                rangemode='tozero',
                range=[0, max_y_value]
            ),
            legend=dict(
                orientation="v",
                yanchor="bottom",
                y=1.02,
                xanchor="right",
                x=1
            ),
            height=400
        )
        
        return jsonify({
            'status': 'success',
            'graph': json.loads(fig.to_json()),
            'data_points': len(months)
        })
        
    except Exception as e:
        #return jsonify({'status': 'error','message': str(e)}), 500
        return {'status': 'error','message': str(e)}, 500
    finally:
        db.close()

def get_performance_data(username):
    try:
        db = next(get_db())
        current_year = datetime.now().year
        quarter_start = datetime(current_year, 10, 1)
        
        # Get all videos for the user without timestamp filtering first
        videos = db.query(Video)\
            .filter(Video.username == username)\
            .all()
        
        if not videos:
            return jsonify({
                'status': 'success',
                'performance': {
                    'total_likes': 0,
                    'total_comments': 0,
                    'total_views': 0,
                    'total_shares': 0
                }
            })
        
        # Process videos and handle timestamp parsing
        filtered_videos = []
        for video in videos:
            try:
                # Handle different timestamp formats
                timestamp_str = video.video_metadata.get('timestamp')
                if timestamp_str:
                    # Try different date formats
                    for fmt in ['%d/%m/%y %H:%M:%S', '%Y-%m-%d %H:%M:%S', '%Y-%m-%dT%H:%M:%S']:
                        try:
                            timestamp = datetime.strptime(timestamp_str, fmt)
                            if timestamp >= quarter_start:
                                filtered_videos.append(video)
                            break
                        except ValueError:
                            continue
            except Exception as e:
                print(f"Error parsing timestamp for video: {e}")
                continue
        
        # Calculate totals from filtered videos
        total_likes = sum(int(v.video_metadata.get('like_count', 0)) for v in filtered_videos)
        total_comments = sum(int(v.video_metadata.get('comment_count', 0)) for v in filtered_videos)
        total_views = sum(int(v.video_metadata.get('view_count', 0)) for v in filtered_videos)
        total_shares = sum(int(v.video_metadata.get('repost_count', 0)) for v in filtered_videos)
        
        return jsonify({
            'status': 'success',
            'performance': {
                'total_likes': total_likes,
                'total_comments': total_comments,
                'total_views': total_views,
                'total_shares': total_shares
            }
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500
    finally:
        db.close()

def get_trends_data(username):
    try:
        db = next(get_db())
        
        # Query the database for the user's videos
        videos = db.query(Video)\
            .filter(Video.username == username)\
            .all()

        if not videos:
            return jsonify({
                'status': 'error',
                'message': 'No data found for the specified user'
            }), 404

        # Filter and process videos
        monthly_data = {}
        min_date = None
        for video in videos:
            try:
                timestamp_str = video.video_metadata.get('timestamp')

                if timestamp_str:
                    # Parse timestamp
                    for fmt in ['%d/%m/%y %H:%M:%S', '%Y-%m-%d %H:%M:%S', '%Y-%m-%dT%H:%M:%S']:
                        try:
                            timestamp = datetime.strptime(timestamp_str, fmt)
                            break
                        except ValueError:
                            continue
                    else:
                        continue
                else:
                    continue

                # Update min_date for calculating the full range of months
                if min_date is None or timestamp < min_date:
                    min_date = timestamp

                # Group data by month
                month_key = timestamp.strftime('%Y-%m')  # YYYY-MM for sorting
                if month_key not in monthly_data:
                    monthly_data[month_key] = {'views': 0, 'likes': 0}

                monthly_data[month_key]['views'] += int(video.video_metadata.get('view_count', 0))
                monthly_data[month_key]['likes'] += int(video.video_metadata.get('like_count', 0))

            except Exception:
                continue

        # Ensure min_date is valid
        if min_date is None:
            return jsonify({
                'status': 'error',
                'message': 'No valid video data found'
            }), 404

        # Generate full list of months from min_date to today
        current_date = datetime.now()
        all_months = []
        while min_date <= current_date:
            all_months.append(min_date.strftime('%Y-%m'))
            min_date += timedelta(days=32)  # Add ~1 month
            min_date = datetime(min_date.year, min_date.month, 1)  # Reset to the first of the next month

        # Prepare data for the graph
        views = [monthly_data.get(month, {}).get('views', 0) for month in all_months]
        likes = [monthly_data.get(month, {}).get('likes', 0) for month in all_months]
        months = [datetime.strptime(month, '%Y-%m').strftime('%b-%y') for month in all_months]  # Convert to MMM-YY

        if not months:
            return jsonify({
                'status': 'error',
                'message': 'No valid data points found'
            }), 404
        
        # Determine the range for the last 12 months
        if len(months) > 12:
            initial_x_range = months[-12:]
        else:
            initial_x_range = months 

        # Find the maximum count for y-axis
        max_y_value = max(max(views, default=0), max(likes, default=0))

         # Create the Plotly figure
        fig = go.Figure()
        
        # Add traces for views and likes
        fig.add_trace(go.Scatter(
            x=months,
            y=views,
            name='Views',
            mode='lines+markers',
            line=dict(color='#00f2ea', width=2),
            marker=dict(size=6),
            fill='tonexty',
            fillcolor='rgba(0, 242, 234, 0.1)'
        ))
        
        fig.add_trace(go.Scatter(
            x=months,
            y=likes,
            name='Likes',
            mode='lines+markers',
            line=dict(color='#ff0050', width=2),
            marker=dict(size=6),
            fill='tonexty',
            fillcolor='rgba(255, 0, 80, 0.1)'
        ))
        
        # Update layout
        fig.update_layout(
            plot_bgcolor='white',
            paper_bgcolor='white',
            margin=dict(l=40, r=20, t=60, b=40),
            hovermode='x unified',
            xaxis=dict(
                title='Month',
                showgrid=False,
                showline=True,
                linecolor='rgba(0,0,0,0.1)',
                tickangle=-50,
                tickmode='array',
                tickvals=months,
                ticktext=months,
                range=[months.index(initial_x_range[0]), months.index(initial_x_range[-1])]
            ),
            yaxis=dict(
                title='Count',
                showgrid=True,
                gridcolor='rgba(0,0,0,0.1)',
                showline=True,
                linecolor='rgba(0,0,0,0.1)',
                rangemode='tozero',
                range=[0, max_y_value]
            ),
            legend=dict(
                orientation="v",
                yanchor="bottom",
                y=1.02,
                xanchor="right",
                x=1
            ),
            height=400
        )
        
        return jsonify({
            'status': 'success',
            'graph': json.loads(fig.to_json()),
            'data_points': len(months)
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
    finally:
        db.close()

def get_active_days_data(username):
    try:
        db = next(get_db())
        
        # Query the database for the user's videos
        videos = db.query(Video)\
            .filter(Video.username == username)\
            .all()

        if not videos:
            return jsonify({
                'status': 'error',
                'message': 'No data found for the specified user'
            }), 404

        # Define day order
        day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

        # Group videos by day and calculate total views
        daily_data = {day: 0 for day in day_order}
        for video in videos:
            try:
                timestamp_str = video.video_metadata.get('timestamp')

                if timestamp_str:
                    # Parse timestamp with multiple formats
                    for fmt in ['%d/%m/%y %H:%M:%S', '%Y-%m-%d %H:%M:%S', '%Y-%m-%dT%H:%M:%S']:
                        try:
                            timestamp = datetime.strptime(timestamp_str, fmt)
                            break
                        except ValueError:
                            continue
                    else:
                        continue
                else:
                    continue

                # Group data by day of the week
                day_key = timestamp.strftime('%A')
                daily_data[day_key] += int(video.video_metadata.get('view_count', 0))

            except Exception:
                continue

        # Filter out days with zero views
        filtered_daily_data = {day: views for day, views in daily_data.items() if views > 0}

        # Prepare data for plotting
        days = [day for day in day_order if day in filtered_daily_data]
        views = [filtered_daily_data[day] for day in days]

        # Create Plotly bar graph
        fig = go.Figure(data=[go.Bar(
            x=days, 
            y=views,
            marker_color='#00f2ea', 
            hovertemplate='%{x}: %{y} views<extra></extra>'
        )])
        
        fig.update_layout(
            plot_bgcolor='white',
            paper_bgcolor='white',
            margin=dict(l=40, r=20, t=60, b=40),
            height=300,
            xaxis_tickangle=-90 
        )
        
        return jsonify({
            'status': 'success',
            'graph': json.loads(fig.to_json()),
            'data_points': len(days)
        })
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
    finally:
        db.close()

def get_duration_analysis(username):
    try:
        db = next(get_db())
        
        # Query the database for the user's videos
        videos = db.query(Video)\
            .filter(Video.username == username)\
            .all()

        if not videos:
            return jsonify({
                'status': 'error',
                'message': 'No data found for the specified user'
            }), 404

        # Define duration categories
        duration_categories = {
            'Dash in a Flash': (0, 15),
            'Forty-Five Drive': (45, 60),
            'Sixty-Plus': (60, float('inf'))
        }

        # Initialize data structure
        duration_data = {
            cat: {
                'count': 0,
                'likes': 0,
                'comments': 0,
                'plays': 0,
                'shares': 0
            } for cat in duration_categories
        }

        # Process videos
        total_videos = 0
        for video in videos:
            try:
                duration = float(video.video_metadata.get('duration', 0))
                
                # Determine category
                for cat_name, (min_dur, max_dur) in duration_categories.items():
                    if min_dur <= duration < max_dur:
                        duration_data[cat_name]['count'] += 1
                        duration_data[cat_name]['likes'] += int(video.video_metadata.get('like_count', 0))
                        duration_data[cat_name]['comments'] += int(video.video_metadata.get('comment_count', 0))
                        duration_data[cat_name]['plays'] += int(video.video_metadata.get('view_count', 0))
                        duration_data[cat_name]['shares'] += int(video.video_metadata.get('repost_count', 0))
                        total_videos += 1
                        break
            except Exception:
                continue

        if total_videos == 0:
            return jsonify({
                'status': 'error',
                'message': 'No valid duration data found'
            }), 404

        def format_number(num):
            """Format numbers to K (thousands) or M (millions)"""
            if num >= 1_000_000:
                return f"{num/1_000_000:.1f}m"
            elif num >= 1_000:
                return f"{num/1_000:.1f}k"
            return str(num)

        # Calculate engagement rates
        for cat in duration_data:
            if duration_data[cat]['plays'] > 0:
                total_engagement = (
                    duration_data[cat]['likes'] + 
                    duration_data[cat]['comments'] + 
                    duration_data[cat]['shares']
                )
                duration_data[cat]['engagement'] = round(
                    (total_engagement / duration_data[cat]['plays']) * 100, 1
                )
            else:
                duration_data[cat]['engagement'] = 0

        # Prepare data for visualization
        categories = list(duration_categories.keys())
        ranges = ['0-15 secs', '45-60 secs', '60+ secs']
        media_counts = [duration_data[cat]['count'] for cat in categories]
        likes = [format_number(duration_data[cat]['likes']) for cat in categories]
        comments = [format_number(duration_data[cat]['comments']) for cat in categories]
        plays = [format_number(duration_data[cat]['plays']) for cat in categories]
        shares = [format_number(duration_data[cat]['shares']) for cat in categories]
        engagement = [duration_data[cat]['engagement'] for cat in categories]

        # Create table figure
        fig = go.Figure(data=[
            go.Table(
                header=dict(
                    values=['TYPE', 'RANGE', 'MEDIA', 'LIKES', 'COMMENTS', 'PLAYS', 'SHARES', 'ENG.'],
                    fill_color='#f4f4f4',
                    align='left',
                    font=dict(size=12, color='#333333')
                ),
                cells=dict(
                    values=[
                        categories,
                        ranges,
                        media_counts,
                        likes,
                        comments,
                        plays,
                        shares,
                        [f"{e}%" for e in engagement]
                    ],
                    fill_color='white',
                    align='left',
                    font=dict(size=12),
                    height=30
                )
            )
        ])

        # Update layout
        fig.update_layout(
            title=dict(
                text='Engagement Trends by Video Duration',
                x=0,  
                xanchor='left',  
                font=dict(
                    size=16,  
                    color='#333333'  
                ),
                xref='paper',
                pad=dict(t=10, b=10)
            ),
            margin=dict(l=0, r=0, t=40, b=0),
            height=200,
            paper_bgcolor='white',
        )

        return jsonify({
            'status': 'success',
            'graph': json.loads(fig.to_json()),
            'data': duration_data
        })

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
    finally:
        db.close()