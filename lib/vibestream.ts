const VIBESTREAM_API = "https://vibestream.machinefi.com";

export interface CheckOnceRequest {
  youtube_url: string;
  condition: string;
  model?: "gemini-2.5-flash" | "gpt-4o-mini";
  include_frame?: boolean;
}

export interface CheckOnceResponse {
  triggered: boolean;
  explanation: string;
  model: string;
  frame_b64?: string | null;
}

export interface LiveMonitorRequest {
  youtube_url: string;
  condition: string;
  model?: "gemini-2.5-flash" | "gpt-4o-mini";
  interval_seconds?: number;
}

export interface MonitorJob {
  id: string;
  youtube_url: string;
  condition: string;
  status: "running" | "stopped" | "error";
  created_at: string;
}

export interface Moment {
  id: string;
  job_id: string;
  timestamp: string;
  result: string;
  score: number;
  frame?: string;
}

/**
 * Check a YouTube stream once and analyze it
 */
export async function checkStream(
  youtubeUrl: string,
  condition: string,
  model: "gemini-2.5-flash" | "gpt-4o-mini" = "gemini-2.5-flash",
  includeFrame: boolean = true
): Promise<CheckOnceResponse> {
  const response = await fetch(`${VIBESTREAM_API}/check-once`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      youtube_url: youtubeUrl,
      condition,
      model,
      include_frame: includeFrame,
    }),
  });

  if (!response.ok) {
    throw new Error(`VibeStream API error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Extract video ID from YouTube URL
 */
export function extractVideoId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  return match ? match[1] : null;
}

/**
 * Get YouTube video thumbnail URL
 */
export function getThumbnailUrl(videoId: string, quality: "maxres" | "high" | "medium" | "default" = "high"): string {
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}

/**
 * Start monitoring a stream continuously
 */
export async function startMonitoring(
  youtubeUrl: string,
  condition: string,
  model: "gemini-2.5-flash" | "gpt-4o-mini" = "gemini-2.5-flash",
  intervalSeconds: number = 30
): Promise<MonitorJob> {
  const response = await fetch(`${VIBESTREAM_API}/live-monitor`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      youtube_url: youtubeUrl,
      condition,
      model,
      interval_seconds: intervalSeconds,
    }),
  });

  if (!response.ok) {
    throw new Error(`VibeStream API error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get all monitoring jobs
 */
export async function getJobs(): Promise<MonitorJob[]> {
  const response = await fetch(`${VIBESTREAM_API}/jobs`);

  if (!response.ok) {
    throw new Error(`VibeStream API error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get moments detected by a job
 */
export async function getMoments(jobId: string): Promise<Moment[]> {
  const response = await fetch(`${VIBESTREAM_API}/moments?job_id=${jobId}`);

  if (!response.ok) {
    throw new Error(`VibeStream API error: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Stop a monitoring job
 */
export async function stopMonitoring(jobId: string): Promise<void> {
  const response = await fetch(`${VIBESTREAM_API}/jobs/${jobId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`VibeStream API error: ${response.statusText}`);
  }
}

/**
 * Calculate viral score based on analysis result
 */
export function calculateViralScore(result: string): number {
  const viralKeywords = [
    "funny", "hilarious", "epic", "amazing", "incredible",
    "shocking", "surprising", "viral", "trending", "exciting",
    "dramatic", "intense", "clutch", "insane", "crazy",
    "fail", "win", "reaction", "emotional", "tear",
  ];

  const lowerResult = result.toLowerCase();
  let score = 50; // base score

  for (const keyword of viralKeywords) {
    if (lowerResult.includes(keyword)) {
      score += 10;
    }
  }

  return Math.min(score, 100);
}
