# Use Python 3.12 Bullseye as the base image
FROM python:3.12-bullseye

# Set working directory
WORKDIR /app

# Copy requirements file and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Use PORT environment variable (Render requirement)
ENV PORT=8000

# Expose port
EXPOSE $PORT

# Command to run the application
CMD gunicorn --workers=4 --bind=0.0.0.0:$PORT --timeout 120 app:app