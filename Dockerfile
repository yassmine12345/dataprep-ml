FROM python:3.11-slim

WORKDIR /app

# Install backend dependencies first (layer caching)
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy backend code
COPY backend /app/backend

# Build dist from public/ so FastAPI can serve the frontend
COPY frontend /app/frontend
RUN mkdir -p /app/frontend/dist && cp -r /app/frontend/public/* /app/frontend/dist/

# Platforms inject PORT at runtime; default to 8080
ENV PORT=8080
EXPOSE 8080

WORKDIR /app/backend
# Use Python startup script so PORT/HOST are read from env via os.environ
# (avoids shell $PORT expansion issues on platforms that pass it literally)
CMD ["python", "-m", "app.start"]