# Build timestamp: 2026-11-20T14:20:00Z - Force rebuild for frontend assets
FROM python:3.11-slim

WORKDIR /app

# Install backend dependencies first (layer caching)
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy backend code
COPY backend /app/backend

# Build dist from public/ so FastAPI can serve the frontend
# Use a build arg to bust cache when frontend changes
ARG FRONTEND_VERSION=20261120
COPY frontend /app/frontend
RUN mkdir -p /app/frontend/dist && cp -r /app/frontend/public/* /app/frontend/dist/ && ls -la /app/frontend/dist/

# Platforms inject PORT at runtime; default to 8080
ENV PORT=8080
EXPOSE 8080

WORKDIR /app/backend
# Use Python startup script so PORT/HOST are read from env via os.environ
# (avoids shell $PORT expansion issues on platforms that pass it literally)
CMD ["python", "-m", "app.start"]