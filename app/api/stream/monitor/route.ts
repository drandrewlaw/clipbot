import { NextRequest, NextResponse } from "next/server";
import { startMonitoring, stopMonitoring } from "@/lib/vibestream";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { youtubeUrl, condition, model, intervalSeconds } = body;

    if (!youtubeUrl || !condition) {
      return NextResponse.json(
        { error: "youtubeUrl and condition are required" },
        { status: 400 }
      );
    }

    const job = await startMonitoring(
      youtubeUrl,
      condition,
      model || "gemini-2.5-flash",
      intervalSeconds || 30
    );

    return NextResponse.json(job);
  } catch (error) {
    console.error("Error starting monitor:", error);
    return NextResponse.json(
      { error: "Failed to start monitoring" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json(
        { error: "jobId is required" },
        { status: 400 }
      );
    }

    await stopMonitoring(jobId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error stopping monitor:", error);
    return NextResponse.json(
      { error: "Failed to stop monitoring" },
      { status: 500 }
    );
  }
}
