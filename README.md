# TikTok Analytics

## Description

There is no official TikTok API. Thus writing script to scrape user videos metadata
Simple website and visualization that allows users extract metadata from TikTok user profiles and downloading the data in various formats.

## Technologies Used

- Python 3.12
- Flask
- Playwright, yt-dlp
- HTML/CSS/JavaScript
- Docker

## Installation

### Clone the Repository and Run Locally

1. **Run locally**  
   Open your terminal or command prompt and run the following command:  
   ```bash
   git clone https://github.com/SANNNNN-123/TikTok_Downloader.git
   cd path/TikTok_Downloader
   python -m venv myenv
   source myenv/bin/activate   # On Windows: myenv\Scripts\activate
   pip install -r requirements.txt
   playwright install
   python app.py

2. **Run via Docker**

    ```bash
    git clone https://github.com/SANNNNN-123/TikTok_Downloader.git
    cd path/TikTok_Downloader
    docker build -t TikTok_Downloader .
    docker run -d -p 5000:5000 TikTok_Downloader

### Demo
https://github.com/user-attachments/assets/0affbb57-92c1-411f-86a1-2dbd497276b7


