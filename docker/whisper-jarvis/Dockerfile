# ffmpeg static (kam-dependency) — bedune `apt install ffmpeg` e sangin-e Debian
FROM mwader/static-ffmpeg:6.1.1 AS ff
FROM python:3.11-slim-bookworm

COPY --from=ff /ffmpeg /usr/local/bin/ffmpeg
COPY --from=ff /ffprobe /usr/local/bin/ffprobe

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .

ENV WHISPER_MODEL=base
ENV WHISPER_DEVICE=cpu
ENV WHISPER_COMPUTE_TYPE=int8

EXPOSE 9000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "9000"]
