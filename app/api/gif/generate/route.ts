import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { randomBytes } from "crypto";
import { writeFile, unlink } from "fs/promises";

const execAsync = promisify(exec);

/**
 * Generate GIF from YouTube video
 * Uses yt-dlp to download segment and ffmpeg to convert to GIF
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { youtubeUrl, startTime = 0, duration = 5, fps = 10, width = 480 } = body;

    if (!youtubeUrl) {
      return NextResponse.json(
        { error: "youtubeUrl is required" },
        { status: 400 }
      );
    }

    // Check for required tools
    try {
      await execAsync("which yt-dlp");
      await execAsync("which ffmpeg");
    } catch {
      return NextResponse.json(
        { error: "yt-dlp and ffmpeg are required on the server" },
        { status: 500 }
      );
    }

    // Generate unique filenames
    const gifId = randomBytes(8).toString("hex");
    const videoPath = `/tmp/clip-${gifId}.mp4`;
    const gifPath = `/tmp/clip-${gifId}.gif`;

    // Download video segment using yt-dlp
    const downloadCommand = [
      "yt-dlp",
      "-f", "best[ext=mp4]/best",
      "--download-sections", `*${startTime}-${startTime + duration}`,
      "-o", videoPath,
      "--no-playlist",
      "--quiet",
      "--no-warnings",
      youtubeUrl,
    ].join(" ");

    await execAsync(downloadCommand, { timeout: 60000 });

    // Convert to GIF using ffmpeg
    // -vf: scale to width, maintain aspect ratio, fps filter
    // Use palette for better quality
    const palettePath = `/tmp/palette-${gifId}.png`;

    // Generate palette
    const paletteCommand = [
      "ffmpeg",
      "-i", videoPath,
      "-vf", `fps=${fps},scale=${width}:-1:flags=lanczos,palettegen`,
      "-y",
      palettePath,
    ].join(" ");

    await execAsync(paletteCommand, { timeout: 30000 });

    // Generate GIF using palette - use shell option to handle complex filter
    const gifCommand = `ffmpeg -i ${videoPath} -i ${palettePath} \
      -filter_complex "fps=${fps},scale=${width}:-1:flags=lanczos[x];[x][1:v]paletteuse" \
      -y ${gifPath}`;

    await execAsync(gifCommand, { timeout: 30000, shell: "/bin/bash" });

    // Read the GIF file
    const fs = await import("fs/promises");
    const gifBuffer = await fs.readFile(gifPath);

    // Clean up temp files
    await unlink(videoPath).catch(() => {});
    await unlink(gifPath).catch(() => {});
    await unlink(palettePath).catch(() => {});

    // Return the GIF as base64
    return NextResponse.json({
      success: true,
      gifId,
      gifData: gifBuffer.toString("base64"),
      mimeType: "image/gif",
      size: gifBuffer.length,
    });

  } catch (error) {
    console.error("Error generating GIF:", error);
    return NextResponse.json(
      { error: "Failed to generate GIF", details: String(error) },
      { status: 500 }
    );
  }
}
