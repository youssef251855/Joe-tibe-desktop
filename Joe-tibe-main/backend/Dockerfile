# JoeTube API backend — Docker image for Render (runtime: docker, PAID plan).
# Installs Python + ffmpeg + yt-dlp so the server's `resolveWithYtDlp` engine works,
# which is a stronger extractor than the pure-Node path (helps with bot-checked videos).
FROM node:20-bookworm-slim

# yt-dlp needs Python; ffmpeg enables audio/video merging for combined MP4 formats.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-pip ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Put yt-dlp on PATH (resolveWithYtDlp falls back to PATH when ./bin/yt-dlp is absent).
# bgutil-ytdlp-pot-provider adds PO-token generation, letting yt-dlp pass YouTube's
# bot-check even from a datacenter IP — this is the engine that "breaks" protected videos.
RUN pip3 install --no-cache-dir --break-system-packages -U yt-dlp bgutil-ytdlp-pot-provider

WORKDIR /app

# Install backend dependencies (no dev-only frontend tooling needed to run the API).
COPY package.json package-lock.json* npm-shrinkwrap.json* ./
RUN npm install

# Copy the API source (server.ts + src/server/**) and run it with tsx.
COPY . .

# Render injects PORT at runtime; server.ts honors process.env.PORT.
ENV NODE_ENV=production
EXPOSE 8080

CMD ["sh", "-c", "npx tsx server.ts"]
