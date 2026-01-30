import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { randomBytes } from "crypto";
import { writeFile, unlink } from "fs/promises";

const execAsync = promisify(exec);

/**
 * Export moment for TikTok/Shorts
 * Generates vertical format video (9:16) with metadata
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      youtubeUrl,
      startTime = 0,
      duration = 15,
      platform = "tiktok", // 'tiktok' or 'youtube'
    } = body;

    if (!youtubeUrl) {
      return NextResponse.json(
        { error: "youtubeUrl is required" },
        { status: 400 }
      );
    }

    // Check for yt-dlp and ffmpeg
    try {
      await execAsync("which yt-dlp");
      await execAsync("which ffmpeg");
    } catch {
      return NextResponse.json(
        { error: "yt-dlp and ffmpeg are required on the server" },
        { status: 500 }
      );
    }

    const clipId = randomBytes(8).toString("hex");
    const downloadPath = `/tmp/clip-${clipId}-source.mp4`;
    const exportPath = `/tmp/clip-${clipId}-vertical.mp4`;

    // Vertical format settings for TikTok/Shorts
    const width = 1080;
    const height = 1920; // 9:16 aspect ratio
    const fps = 30;

    // Download video segment
    const downloadCmd = [
      "yt-dlp",
      "-f", "best[ext=mp4]/best",
      "--download-sections", `*${startTime}-${startTime + duration}`,
      "-o", downloadPath,
      "--no-playlist",
      "--quiet",
      "--no-warnings",
      youtubeUrl,
    ].join(" ");

    try {
      await execAsync(downloadCmd, { timeout: 120000 });
    } catch (execError: any) {
      // Check if file was created despite the error
      const fs = await import("fs/promises");
      try {
        await fs.stat(downloadPath);
      } catch {
        throw execError;
      }
    }

    // Convert to vertical format for TikTok/Shorts
    // Scale to fit height, then crop to exact dimensions
    const convertCmd = `ffmpeg -i ${downloadPath} \
      -vf "scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}:(ow-iw)/2:(oh-ih)/2" \
      -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 128k \
      -movflags +faststart \
      -y ${exportPath}`;

    await execAsync(convertCmd, {
      timeout: 120000,
      shell: "/bin/bash",
      maxBuffer: 50 * 1024 * 1024,
    });

    // Read the exported video
    const fs = await import("fs/promises");
    const videoBuffer = await fs.readFile(exportPath);
    const sizeMB = (videoBuffer.length / (1024 * 1024)).toFixed(2);

    // Clean up temp files
    await unlink(downloadPath).catch(() => {});
    await unlink(exportPath).catch(() => {});

    // Generate metadata for the platform
    const platformName = platform === "tiktok" ? "TikTok" : "YouTube Shorts";
    const hashtags = platform === "tiktok"
      ? "#fyp #viral #foryou #gaming #clips #ClipBot"
      : "#Shorts #viral #gaming #clips #ClipBot";

    return NextResponse.json({
      success: true,
      clipId,
      platform,
      platformName,
      size: sizeMB + " MB",
      duration,
      resolution: `${width}x${height}`,
      aspectRatio: "9:16 (vertical)",
      metadata: {
        title: `✨ Viral moment detected by ClipBot!`,
        description: `Caught this epic moment using AI-powered viral detection.\n\n${hashtags}`,
        hashtags,
      },
      message: `${platformName}-ready vertical clip created!`,
    });

  } catch (error) {
    console.error("Error exporting clip:", error);
    return NextResponse.json(
      {
        error: "Failed to export clip",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
