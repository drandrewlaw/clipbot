import { NextRequest, NextResponse } from "next/server";
import { checkStream } from "@/lib/vibestream";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { youtubeUrl, condition, model } = body;

    if (!youtubeUrl || !condition) {
      return NextResponse.json(
        { error: "youtubeUrl and condition are required" },
        { status: 400 }
      );
    }

    const result = await checkStream(youtubeUrl, condition, model || "gemini-2.5-flash");

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error checking stream:", error);
    return NextResponse.json(
      { error: "Failed to check stream" },
      { status: 500 }
    );
  }
}
