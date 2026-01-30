import { NextRequest, NextResponse } from "next/server";
import { getMoments } from "@/lib/vibestream";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      return NextResponse.json(
        { error: "jobId is required" },
        { status: 400 }
      );
    }

    const moments = await getMoments(jobId);

    return NextResponse.json(moments);
  } catch (error) {
    console.error("Error getting moments:", error);
    return NextResponse.json(
      { error: "Failed to get moments" },
      { status: 500 }
    );
  }
}
