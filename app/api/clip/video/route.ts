import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { randomBytes } from "crypto";
import { writeFile, unlink } from "fs/promises";

const execAsync = promisify(exec);

/**
 * Generate full video clip from YouTube
 * Downloads a video segment around the detected moment
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      youtubeUrl,
      startTime = 0,
      duration = 30
    } = body;

    if (!youtubeUrl) {
      return NextResponse.json(
        { error: "youtubeUrl is required" },
        { status: 400 }
      );
    }

    // Check for yt-dlp
    try {
      await execAsync("which yt-dlp");
    } catch {
      return NextResponse.json(
        { error: "yt-dlp is required on the server" },
        { status: 500 }
      );
    }

    // Generate unique filename
    const clipId = randomBytes(8).toString("hex");
    const outputPath = `/tmp/clip-${clipId}.mp4`;

    // Download video segment using yt-dlp
    // Use best available format that works
    const command = [
      "yt-dlp",
      "-f", "best[ext=mp4]/best", // Best MP4 format, fallback to best
      "--download-sections", `*${startTime}-${startTime + duration}`,
      "-o", outputPath,
      "--no-playlist",
      "--max-downloads", "1",
      "--quiet",
      "--no-warnings",
      "--merge-output-format", "mp4",
      youtubeUrl,
    ].join(" ");

    try {
      await execAsync(command, {
        timeout: 120000, // 2 minute timeout
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });
    } catch (execError: any) {
      // yt-dlp might exit with code 101 due to --max-downloads, but file is created
      // Check if file exists and has content
      const fs = await import("fs/promises");
      try {
        const stats = await fs.stat(outputPath);
        if (stats.size === 0) {
          throw execError; // File is empty, throw original error
        }
        // File exists and has content, continue
      } catch {
        throw execError; // File doesn't exist, throw original error
      }
    }

    // Read the video file
    const fs = await import("fs/promises");
    const videoBuffer = await fs.readFile(outputPath);

    // Get file size in MB
    const sizeMB = (videoBuffer.length / (1024 * 1024)).toFixed(2);

    // Clean up temp file
    await unlink(outputPath).catch(() => {});

    // Return video info (not the full video to avoid size limits)
    // In production, you'd upload to cloud storage and return URL
    return NextResponse.json({
      success: true,
      clipId,
      size: sizeMB + " MB",
      duration,
      // For demo, return a smaller base64 preview or just metadata
      // Full video would be too large for JSON response
      message: "Video clip generated successfully",
      // Uncomment if you want to return base64 (warning: large!)
      // videoData: videoBuffer.slice(0, 1000000).toString("base64"), // First 1MB preview
    });

  } catch (error) {
    console.error("Error generating video clip:", error);
    return NextResponse.json(
      {
        error: "Failed to generate video clip",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
