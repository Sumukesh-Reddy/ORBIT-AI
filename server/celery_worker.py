"""
Celery Worker Entry Point
=========================

Start the worker with:
    celery -A celery_worker worker --loglevel=info --concurrency=4

Monitor with Flower:
    celery -A celery_worker flower --port=5555
"""

from app.documents.worker import celery_app

# Re-export so Celery CLI can find it
app = celery_app
