# Use Python 3.12 Bullseye as the base image
FROM python:3.12-bullseye

# Set working directory
WORKDIR /app

# Install system dependencies for Playwright
RUN apt-get update && apt-get install -y \
    libnss3 \
    libnspr4 \
    libdbus-1-3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libatspi2.0-0 \
    && apt-get clean

# Copy requirements file and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright and its dependencies
RUN pip install playwright && playwright install-deps && playwright install chromium


# Copy application code
COPY . .

# Use PORT environment variable (Render requirement)
ENV PORT=8000

# Expose port
EXPOSE $PORT

# Command to run the application
CMD gunicorn --workers=4 --bind=0.0.0.0:$PORT --timeout 120 app:app