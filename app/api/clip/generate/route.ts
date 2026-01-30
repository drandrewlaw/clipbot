import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { writeFile, unlink } from "fs/promises";
import { randomBytes } from "crypto";

const execAsync = promisify(exec);

// Generate video clip using yt-dlp
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { youtubeUrl, startTime = 0, duration = 15 } = body;

    if (!youtubeUrl) {
      return NextResponse.json(
        { error: "youtubeUrl is required" },
        { status: 400 }
      );
    }

    // Check if yt-dlp is installed
    try {
      await execAsync("which yt-dlp");
    } catch {
      return NextResponse.json(
        { error: "yt-dlp is not installed on the server" },
        { status: 500 }
      );
    }

    // Generate unique filename
    const clipId = randomBytes(8).toString("hex");
    const outputPath = `/tmp/clip-${clipId}.mp4`;

    // Download clip using yt-dlp
    // -f: format (best video + best audio)
    // --download-sections: download specific section
    // --section-start: start time in seconds
    // -o: output file
    const command = [
      "yt-dlp",
      "-f", "best[ext=mp4]/best",
      "--download-sections", `*${startTime}-${startTime + duration}`,
      "-o", outputPath,
      "--no-playlist",
      "--max-downloads", "1",
      "--quiet",
      "--no-warnings",
      youtubeUrl,
    ].join(" ");

    const { stdout, stderr } = await execAsync(command, {
      timeout: 60000, // 60 second timeout
    });

    if (stderr && !stderr.includes("WARNING")) {
      console.error("yt-dlp stderr:", stderr);
    }

    // Read the file and convert to base64
    // Note: In production, you'd want to store this in a cloud storage service
    const fs = await import("fs/promises");
    const clipBuffer = await fs.readFile(outputPath);

    // Clean up temp file
    await unlink(outputPath).catch(() => {});

    // Return the clip as base64 (for demo purposes)
    // In production, return a URL to the stored file
    return NextResponse.json({
      success: true,
      clipId,
      clipData: clipBuffer.toString("base64"),
      mimeType: "video/mp4",
    });

  } catch (error) {
    console.error("Error generating clip:", error);
    return NextResponse.json(
      { error: "Failed to generate clip", details: String(error) },
      { status: 500 }
    );
  }
}
