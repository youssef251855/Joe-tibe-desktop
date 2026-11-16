import app from "./src/server/app";

// Standalone API server for Render (frontend is hosted separately, e.g. Vercel, and
// reaches this service via VITE_API_BASE). Render injects PORT at runtime.
const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 JoeTube API backend running on http://localhost:${PORT}`);
  console.log(`⚡ Direct YouTube Media Streaming + Secure CDN Proxy (TikTok/Facebook/Instagram/X)`);
});
