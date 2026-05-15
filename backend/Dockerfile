FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=5000

WORKDIR /app

# System deps needed by psycopg2, pillow, reportlab, python-magic
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev libmagic1 libjpeg-dev zlib1g-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# python-magic-bin is Windows-only; swap to python-magic on Linux
RUN sed -i 's/^python-magic-bin==.*/python-magic==0.4.27/' requirements.txt \
 && pip install --upgrade pip \
 && pip install -r requirements.txt \
 && pip install gunicorn==21.2.0

COPY . /app

RUN mkdir -p /app/uploads /app/logs

EXPOSE 5000

# DEMO: single worker, plain logs to stdout
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--threads", "2", \
     "--timeout", "120", "--access-logfile", "-", "--error-logfile", "-", "run:app"]
