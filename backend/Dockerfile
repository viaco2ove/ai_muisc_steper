# backend/Dockerfile
FROM python:3.12-slim

WORKDIR /app

# install system deps
RUN apt-get update && apt-get install -y --no-install-recommends     ffmpeg git curl && rm -rf /var/lib/apt/lists/*

# install python deps
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# copy app
COPY backend/ ./backend/
COPY .workbuddy/ ./.workbuddy/
COPY workspace/ ./workspace/
COPY models.json ./.env ./

ENV PYTHONIOENCODING=utf-8
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
