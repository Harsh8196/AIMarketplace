FROM --platform=linux/amd64 python:3.10-slim
WORKDIR /code
ENV FLASK_APP=app.py
ENV FLASK_RUN_HOST=0.0.0.0
RUN apt-get update
RUN apt-get install -y gcc g++ cmake make gfortran pkg-config libffi-dev git curl ffmpeg libavcodec-extra libssl-dev
RUN pip install poetry
# Copy only requirements to cache them in docker layer
WORKDIR /code
COPY pyproject.toml /code/
# Project initialization:
RUN poetry install
EXPOSE 8000