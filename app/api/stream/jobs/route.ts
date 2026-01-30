import { NextResponse } from "next/server";
import { getJobs } from "@/lib/vibestream";

export async function GET() {
  try {
    const jobs = await getJobs();

    return NextResponse.json(jobs);
  } catch (error) {
    console.error("Error getting jobs:", error);
    return NextResponse.json(
      { error: "Failed to get jobs" },
      { status: 500 }
    );
  }
}
