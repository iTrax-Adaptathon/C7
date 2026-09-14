# Adaptive Fitness Coach — backend API image.
# Build:  docker build -t adaptive-fitness-api .
# Run:    docker run -p 8000:8000 adaptive-fitness-api
#
# Ships with the committed, seeded fitness.db so the API is immediately
# usable. Mount a volume at /app/data and set DATABASE_URL to persist
# writes beyond the container's lifetime, e.g.:
#   docker run -p 8000:8000 -v fitness-data:/app/data \
#     -e DATABASE_URL=sqlite:////app/data/fitness.db adaptive-fitness-api

FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ backend/
COPY fitness.db .

ENV DATABASE_URL=sqlite:///./fitness.db
ENV CORS_ORIGINS=*
EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
