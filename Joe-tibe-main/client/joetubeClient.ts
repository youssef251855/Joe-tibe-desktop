/**
 * Joe Tube Frontend API Client Library
 * Connects the frontend UI to the Joe Tube Serverless Backend.
 */

const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined' && (window as any).JOE_TUBE_API_URL) {
    return (window as any).JOE_TUBE_API_URL;
  }
  // If running on Vercel or production domain, use relative /api
  if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
    return '';
  }
  return 'https://joetube-one.vercel.app';
};

export const joetubeClient = {
  async healthCheck() {
    const res = await fetch(`${getApiBaseUrl()}/api/health`);
    return res.json();
  },

  async inspectUrl(url: string) {
    const res = await fetch(`${getApiBaseUrl()}/api/inspect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    return res.json();
  },

  async getMetadata(url: string) {
    const res = await fetch(`${getApiBaseUrl()}/api/metadata`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    return res.json();
  },

  async createJob(url: string, format: string = 'mp3') {
    const res = await fetch(`${getApiBaseUrl()}/api/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, format })
    });
    return res.json();
  },

  async getJobStatus(jobId: string) {
    const res = await fetch(`${getApiBaseUrl()}/api/job-status?id=${encodeURIComponent(jobId)}`);
    return res.json();
  },

  async requestDownload(url: string, format: string = 'mp3') {
    const res = await fetch(`${getApiBaseUrl()}/api/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, format })
    });
    return res.json();
  },

  async getProviders() {
    const res = await fetch(`${getApiBaseUrl()}/api/providers`);
    return res.json();
  }
};
