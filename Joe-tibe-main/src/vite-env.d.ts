/// <reference types="vite/client" />

// Type for the configurable backend origin used by src/lib/apiBase.ts.
// Set VITE_API_BASE (e.g. https://your-service.onrender.com) at build time.
interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
