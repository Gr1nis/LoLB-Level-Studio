# LoLB Level Studio - Lightweight Container
FROM python:3.11-alpine

# Set working directory inside container
WORKDIR /app

# Environment configuration
ENV PORT=8080 \
    PYTHONUNBUFFERED=1 \
    DATA_DIR=/app/data

# Copy application files (server, solver, static frontend, catalogs, levels)
COPY . /app/

# Expose default HTTP port
EXPOSE 8080

# Persistent data volume for level JSONs
VOLUME ["/app/data"]

# Healthcheck using standard library urllib
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request, os; urllib.request.urlopen(f'http://localhost:{os.environ.get(\"PORT\", 8080)}/index.html')" || exit 1

# Launch the zero-dependency Python server
CMD ["python", "server.py"]
