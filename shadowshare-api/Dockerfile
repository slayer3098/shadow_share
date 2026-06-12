FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create instance directory for database
RUN mkdir -p instance

# Expose the default local port. Railway injects PORT at runtime.
EXPOSE 8000

# Health check (use stdlib to avoid extra dependency)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import os,urllib.request,sys; port=os.getenv('PORT','8000'); r=urllib.request.urlopen(f'http://127.0.0.1:{port}/api/health'); sys.exit(0 if r.getcode()==200 else 1)"

# Run the application with a production WSGI server.
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-8000} --workers ${WEB_CONCURRENCY:-2} --timeout ${GUNICORN_TIMEOUT:-120} run:app"]
