FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies for ping3 and other tools
RUN apt-get update && apt-get install -y \
    iputils-ping \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create writable cache dirs (HF Spaces requires this for permissions)
RUN mkdir -p /tmp/cache && chmod -R 777 /tmp/cache
ENV HOME=/tmp
ENV TMPDIR=/tmp
ENV PYTHONUNBUFFERED=1

# Hugging Face Spaces uses port 7860 by default
EXPOSE 7860

# Start the FastAPI app on port 7860
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
