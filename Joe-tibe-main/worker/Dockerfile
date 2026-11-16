# JoeTube extraction worker — Python + yt-dlp + PO-token provider + Node.
# Deployable on any Docker host (fly.io free tier, Railway trial, Render Docker, VPS).
FROM node:20-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip python3-setuptools ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# yt-dlp + bgutil-ytdlp-pot-provider. The pip package auto-registers a yt-dlp plugin
# (via Python entrypoints) that mints PO tokens for YouTube's attestation challenge,
# letting yt-dlp bypass the "not a bot" check even from a datacenter IP. When the PO
# server is unavailable yt-dlp still tries to resolve normally, so this never hard-fails.
RUN pip3 install --no-cache-dir --break-system-packages -U yt-dlp bgutil-ytdlp-pot-provider \
  && yt-dlp --version

WORKDIR /app
COPY . /app

EXPOSE 8080
ENV PORT=8080
CMD ["node", "index.js"]
