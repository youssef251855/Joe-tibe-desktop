export interface JobItem {
  id: string;
  url: string;
  platform: string;
  format: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'expired';
  progress: number;
  createdAt: number;
  result?: any;
  error?: string;
}

// In-memory store fallback for serverless
const memoryJobStore = new Map<string, JobItem>();

async function upstashCommand(command: any[]): Promise<any> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(command),
      signal: AbortSignal.timeout(4000)
    });
    if (res.ok) {
      const data = await res.json();
      return data.result;
    }
  } catch (err) {
    console.warn("Upstash Redis connection note:", err);
  }
  return null;
}

export const jobManager = {
  async createJob(url: string, platform: string, format: string): Promise<JobItem> {
    const id = 'job_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const job: JobItem = {
      id,
      url,
      platform,
      format,
      status: 'queued',
      progress: 0,
      createdAt: Date.now()
    };

    memoryJobStore.set(id, job);

    // Persist in Upstash Redis
    await upstashCommand(["SET", `job:${id}`, JSON.stringify(job), "EX", "86400"]);

    return job;
  },

  async getJob(id: string): Promise<JobItem | null> {
    // Try Upstash Redis first
    const redisVal = await upstashCommand(["GET", `job:${id}`]);
    if (redisVal) {
      try {
        const parsed: JobItem = typeof redisVal === 'string' ? JSON.parse(redisVal) : redisVal;
        if (parsed && Date.now() - parsed.createdAt > 24 * 60 * 60 * 1000) {
          parsed.status = 'expired';
        }
        return parsed;
      } catch {}
    }

    // Fallback to memory store
    const job = memoryJobStore.get(id);
    if (!job) return null;

    if (Date.now() - job.createdAt > 24 * 60 * 60 * 1000) {
      job.status = 'expired';
      memoryJobStore.set(id, job);
    }

    return job;
  },

  async updateJob(id: string, update: Partial<JobItem>): Promise<JobItem | null> {
    let job = await this.getJob(id);
    if (!job) {
      const memJob = memoryJobStore.get(id);
      if (!memJob) return null;
      job = memJob;
    }

    const updated: JobItem = {
      ...job,
      ...update
    };

    memoryJobStore.set(id, updated);
    await upstashCommand(["SET", `job:${id}`, JSON.stringify(updated), "EX", "86400"]);

    return updated;
  }
};
