"use client";

import { useState, useEffect } from "react";
import { Plus, Play, Pause, Sparkles, Clock, TrendingUp, Loader2, AlertCircle, Download, Video, Image as ImageIcon, Gift, Share2, Copy, Check } from "lucide-react";

type Platform = "youtube" | "twitch";

interface Stream {
  id: string;
  url: string;
  title: string;
  platform: Platform;
  videoId?: string; // YouTube video ID
  channelName?: string; // Twitch channel name
  status: "monitoring" | "idle" | "error" | "checking";
  jobId?: string;
  lastChecked?: string;
}

interface Moment {
  id: string;
  streamId: string;
  timestamp: string;
  caption: string;
  score: number;
  frame?: string; // base64 image data
  gif?: string; // base64 GIF data
  videoClipGenerated?: boolean; // Full video clip generated
  videoClipInfo?: { size: string; duration: number }; // Video clip metadata
  videoClipDownloadUrl?: string; // URL to download the clip
  streamUrl?: string; // Original stream URL for clip generation
  videoId?: string; // YouTube video ID
  channelName?: string; // Twitch channel name
  generatingGif?: boolean; // Show loading state
  generatingVideo?: boolean; // Show loading state for video
}

// Viral moment detection conditions
const VIRAL_CONDITIONS = [
  "Describe what you see in detail",
  "Is something funny, surprising, or shocking happening?",
  "Is there an exciting or intense moment?",
  "Is there something unusual or interesting?",
  "What action or activity is occurring?",
];

// Random condition for demonstration
const getRandomCondition = () => {
  return VIRAL_CONDITIONS[Math.floor(Math.random() * VIRAL_CONDITIONS.length)];
};

export default function Dashboard() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [newStreamUrl, setNewStreamUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMomentId, setCopiedMomentId] = useState<string | null>(null);

  // Poll streams that are in monitoring state
  useEffect(() => {
    const monitoringStreams = streams.filter(s => s.status === "monitoring");

    if (monitoringStreams.length === 0) return;

    const interval = setInterval(async () => {
      for (const stream of monitoringStreams) {
        await checkStreamForMoments(stream);
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [streams]);

  const detectPlatform = (url: string): Platform | null => {
    if (url.match(/(youtube\.com|youtu\.be)/)) return "youtube";
    if (url.match(/twitch\.tv/)) return "twitch";
    return null;
  };

  const extractVideoId = (url: string): string | null => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    return match ? match[1] : null;
  };

  const extractChannelName = (url: string): string | null => {
    const match = url.match(/twitch\.tv\/([^\/\?]+)/);
    return match ? match[1] : null;
  };

  const addStream = async () => {
    if (!newStreamUrl.trim()) return;

    const platform = detectPlatform(newStreamUrl);
    if (!platform) {
      alert("Please enter a valid YouTube or Twitch URL");
      return;
    }

    let newStream: Stream;

    if (platform === "youtube") {
      const videoId = extractVideoId(newStreamUrl);
      if (!videoId) {
        alert("Invalid YouTube URL");
        return;
      }
      newStream = {
        id: Date.now().toString(),
        url: newStreamUrl,
        title: `Stream ${streams.length + 1}`,
        platform: "youtube",
        videoId,
        status: "idle",
      };
    } else {
      const channelName = extractChannelName(newStreamUrl);
      if (!channelName) {
        alert("Invalid Twitch URL");
        return;
      }
      newStream = {
        id: Date.now().toString(),
        url: newStreamUrl,
        title: `${channelName}'s Stream`,
        platform: "twitch",
        channelName,
        status: "idle",
      };
    }

    setStreams([...streams, newStream]);
    setNewStreamUrl("");
  };

  const toggleMonitoring = async (id: string) => {
    const stream = streams.find(s => s.id === id);
    if (!stream) return;

    if (stream.status === "monitoring") {
      // Stop monitoring
      setStreams(streams.map(s =>
        s.id === id ? { ...s, status: "idle" } : s
      ));
    } else {
      // Start monitoring - do an initial check
      setStreams(streams.map(s =>
        s.id === id ? { ...s, status: "monitoring" } : s
      ));
      await checkStreamForMoments({ ...stream, status: "monitoring" });
    }
  };

  const checkStreamForMoments = async (stream: Stream) => {
    try {
      // For Twitch, skip for now (VibeStream is YouTube-focused)
      if (stream.platform === "twitch") {
        setStreams(prev => prev.map(s =>
          s.id === stream.id ? {
            ...s,
            status: "monitoring",
            lastChecked: new Date().toLocaleTimeString(),
          } : s
        ));
        // Simulate an occasional moment for demo purposes
        if (Math.random() > 0.7) {
          const twitchMoments = [
            "E gaming moment with excited reaction",
            "Hilarious fail during gameplay",
            "Epic clutch play that turned the game around",
            "Chat going wild over an incredible play",
            "Streamer's genuine surprise at a gift",
          ];
          const randomMoment = twitchMoments[Math.floor(Math.random() * twitchMoments.length)];
          const score = 50 + Math.floor(Math.random() * 40);

          const newMoment: Moment = {
            id: Date.now().toString(),
            streamId: stream.id,
            timestamp: new Date().toLocaleTimeString(),
            caption: `Twitch: ${randomMoment}`,
            score,
            streamUrl: stream.url,
            channelName: stream.channelName,
          };

          setMoments(prev => [newMoment, ...prev].slice(0, 20));
        }
        return;
      }

      // Update stream status to checking
      setStreams(prev => prev.map(s =>
        s.id === stream.id ? { ...s, status: "checking" } : s
      ));

      const condition = getRandomCondition();

      const response = await fetch("/api/stream/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          youtubeUrl: stream.url,
          condition,
          model: "gemini-2.5-flash",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to check stream");
      }

      const data = await response.json();

      // Update stream status back to monitoring
      setStreams(prev => prev.map(s =>
        s.id === stream.id ? {
          ...s,
          status: "monitoring",
          lastChecked: new Date().toLocaleTimeString(),
        } : s
      ));

      // If the moment was triggered, add it to the list
      if (data.triggered && data.explanation) {
        // Calculate viral score based on keywords in the explanation
        const viralKeywords = [
          "funny", "exciting", "surprising", "shocking", "unusual",
          "emotional", "reaction", "fail", "win", "clutch",
          "intense", "dramatic", "unexpected", "amazing", "cat",
          "dog", "animal", "viral", "trending", "epic"
        ];

        const lowerResult = data.explanation.toLowerCase();
        let score = 40; // base score (triggered moments start higher)

        for (const keyword of viralKeywords) {
          if (lowerResult.includes(keyword)) {
            score += 10;
          }
        }

        // Add the moment with its viral score AND frame capture
        const newMoment: Moment = {
          id: Date.now().toString(),
          streamId: stream.id,
          timestamp: new Date().toLocaleTimeString(),
          caption: data.explanation,
          score: Math.min(score, 100),
          frame: data.frame_b64 || undefined, // Captured frame from VibeStream
          streamUrl: stream.url, // Store for clip generation
          videoId: stream.videoId, // Store video ID
        };

        setMoments(prev => [newMoment, ...prev].slice(0, 20)); // Keep last 20 moments
      }
    } catch (error) {
      console.error("Error checking stream:", error);
      setStreams(prev => prev.map(s =>
        s.id === stream.id ? { ...s, status: "error" } : s
      ));
    }
  };

  const removeStream = (id: string) => {
    setStreams(streams.filter(s => s.id !== id));
    setMoments(moments.filter(m => m.streamId !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">ClipBot</h1>
                <p className="text-xs text-slate-400">Viral Moment Detective</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg bg-slate-800/50 px-3 py-1.5">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                <span className="text-xs text-slate-300">{streams.filter(s => s.status === "monitoring").length} monitoring</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-yellow-500/10 px-3 py-1.5">
                <Sparkles className="h-3 w-3 text-yellow-500" />
                <span className="text-xs text-yellow-500">{moments.length} moments</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Add Stream Section */}
        <section className="mb-8">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <h2 className="mb-4 text-lg font-semibold">Add Stream to Monitor</h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={newStreamUrl}
                onChange={(e) => setNewStreamUrl(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addStream()}
                placeholder="https://www.youtube.com/watch?v=... or https://www.twitch.tv/..."
                className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              <button
                onClick={addStream}
                disabled={isLoading}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-3 font-medium transition-all hover:from-violet-600 hover:to-fuchsia-600 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                Add Stream
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              💡 Try any live YouTube stream! ClipBot will analyze it for viral-worthy moments.
            </p>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Streams List */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Monitored Streams</h2>
              <span className="text-sm text-slate-400">{streams.length} total</span>
            </div>
            <div className="space-y-3">
              {streams.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/30 p-8 text-center">
                  <Sparkles className="mx-auto mb-3 h-10 w-10 text-slate-600" />
                  <p className="text-slate-400">No streams yet. Add one above to start detecting viral moments!</p>
                </div>
              ) : (
                streams.map((stream) => (
                  <div
                    key={stream.id}
                    className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition-all hover:border-slate-700"
                  >
                    <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-lg bg-slate-950 overflow-hidden">
                      <img
                        src={
                          stream.platform === "youtube"
                            ? `https://img.youtube.com/vi/${stream.videoId}/mqdefault.jpg`
                            : `https://static-cdn.jtvnw.net/jtv_user_pictures/${stream.channelName}-profile_image-70x70.png`
                        }
                        alt=""
                        className="h-full w-full rounded-lg object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          stream.platform === "youtube"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-purple-500/20 text-purple-400"
                        }`}>
                          {stream.platform === "youtube" ? "YouTube" : "Twitch"}
                        </span>
                        <p className="truncate text-sm font-medium">{stream.title}</p>
                      </div>
                      <p className="text-xs text-slate-400 truncate">{stream.url}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        {stream.status === "checking" && (
                          <span className="flex items-center gap-1 text-blue-400">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Checking...
                          </span>
                        )}
                        {stream.status === "monitoring" && stream.lastChecked && (
                          <span className="text-slate-500">Last: {stream.lastChecked}</span>
                        )}
                        {stream.status === "error" && (
                          <span className="flex items-center gap-1 text-red-400">
                            <AlertCircle className="h-3 w-3" />
                            Error
                          </span>
                        )}
                        {stream.platform === "twitch" && stream.status === "monitoring" && (
                          <span className="text-amber-500">Beta</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleMonitoring(stream.id)}
                      disabled={stream.status === "checking"}
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all ${
                        stream.status === "monitoring" || stream.status === "checking"
                          ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                      } ${stream.status === "checking" ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {stream.status === "checking" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : stream.status === "monitoring" ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => removeStream(stream.id)}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-all"
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Detected Moments */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-yellow-500" />
                Viral Moments Detected
              </h2>
              <span className="text-sm text-slate-400">{moments.length} found</span>
            </div>
            <div className="space-y-3">
              {moments.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/30 p-8 text-center">
                  <Clock className="mx-auto mb-3 h-10 w-10 text-slate-600" />
                  <p className="text-slate-400">
                    {streams.length === 0
                      ? "Add a stream to start detecting moments!"
                      : "Monitoring for viral moments... This may take a moment."}
                  </p>
                </div>
              ) : (
                moments.map((moment) => (
                  <div
                    key={moment.id}
                    className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition-all hover:border-slate-700"
                  >
                    {/* Frame Image Display */}
                    {moment.frame && (
                      <div className="mb-3 rounded-lg overflow-hidden bg-slate-950">
                        <img
                          src={`data:image/jpeg;base64,${moment.frame}`}
                          alt="Captured moment"
                          className="w-full h-auto object-cover max-h-48"
                        />
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-yellow-500/20">
                        <Sparkles className="h-5 w-5 text-yellow-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{moment.caption}</p>
                        <div className="mt-2 flex items-center gap-3 text-xs">
                          <span className="flex items-center gap-1 text-slate-400">
                            <Clock className="h-3 w-3" />
                            {moment.timestamp}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full ${
                            moment.score >= 80
                              ? "bg-yellow-500/20 text-yellow-500"
                              : moment.score >= 60
                              ? "bg-orange-500/20 text-orange-500"
                              : "bg-blue-500/20 text-blue-500"
                          }`}>
                            ★ {moment.score}% viral
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {/* Download Frame Button */}
                          {moment.frame && (
                            <button
                              onClick={() => {
                                const link = document.createElement("a");
                                link.href = `data:image/jpeg;base64,${moment.frame}`;
                                link.download = `clipbot-moment-${moment.id}.jpg`;
                                link.click();
                              }}
                              className="flex items-center gap-1.5 rounded-lg bg-blue-500/20 px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-500/30 transition-colors"
                            >
                              <ImageIcon className="h-3 w-3" />
                              Frame
                            </button>
                          )}

                          {/* Generate GIF Button */}
                          <button
                            onClick={async () => {
                              // Update moment to show loading state
                              setMoments(prev => prev.map(m =>
                                m.id === moment.id ? { ...m, generatingGif: true } : m
                              ));

                              try {
                                const response = await fetch("/api/gif/generate", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    youtubeUrl: moment.streamUrl,
                                    startTime: 0,
                                    duration: 5,
                                    fps: 10,
                                    width: 480,
                                  }),
                                });

                                const data = await response.json();

                                if (data.success && data.gifData) {
                                  // Update moment with GIF data
                                  setMoments(prev => prev.map(m =>
                                    m.id === moment.id ? { ...m, gif: data.gifData, generatingGif: false } : m
                                  ));
                                }
                              } catch (error) {
                                console.error("Error generating GIF:", error);
                                setMoments(prev => prev.map(m =>
                                  m.id === moment.id ? { ...m, generatingGif: false } : m
                                ));
                              }
                            }}
                            disabled={moment.generatingGif || !!moment.gif}
                            className="flex items-center gap-1.5 rounded-lg bg-pink-500/20 px-3 py-1.5 text-xs font-medium text-pink-400 hover:bg-pink-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {moment.generatingGif ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Gift className="h-3 w-3" />
                            )}
                            {moment.gif ? "GIF Ready" : moment.generatingGif ? "Generating..." : "Generate GIF"}
                          </button>

                          {/* Download GIF Button */}
                          {moment.gif && (
                            <button
                              onClick={() => {
                                const link = document.createElement("a");
                                link.href = `data:image/gif;base64,${moment.gif}`;
                                link.download = `clipbot-moment-${moment.id}.gif`;
                                link.click();
                              }}
                              className="flex items-center gap-1.5 rounded-lg bg-green-500/20 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/30 transition-colors"
                            >
                              <Download className="h-3 w-3" />
                              Download GIF
                            </button>
                          )}

                          {/* Open Video Button */}
                          <button
                            onClick={() => window.open(moment.streamUrl, "_blank")}
                            className="flex items-center gap-1.5 rounded-lg bg-purple-500/20 px-3 py-1.5 text-xs font-medium text-purple-400 hover:bg-purple-500/30 transition-colors"
                            title="Open video to clip manually"
                          >
                            <Video className="h-3 w-3" />
                            Video
                          </button>

                          {/* Share Button */}
                          <button
                            onClick={() => {
                              const shareText = `🎬 Viral moment detected by ClipBot!\n\n${moment.caption}\n\n⭐ Viral Score: ${moment.score}%\n\n🔗 Detected by ClipBot - Viral Moment Detective`;
                              const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent("https://clipbot-tawny.vercel.app")}&hashtags=ViralMoment,ClipBot,AI`;
                              window.open(shareUrl, "_blank");
                            }}
                            className="flex items-center gap-1.5 rounded-lg bg-sky-500/20 px-3 py-1.5 text-xs font-medium text-sky-400 hover:bg-sky-500/30 transition-colors"
                            title="Share to X/Twitter"
                          >
                            <Share2 className="h-3 w-3" />
                            Share
                          </button>

                          {/* Copy Button */}
                          <button
                            onClick={async () => {
                              const copyText = `🎬 Viral moment detected by ClipBot!\n\n${moment.caption}\n\n⭐ Viral Score: ${moment.score}%\n\n🔗 https://clipbot-tawny.vercel.app`;
                              try {
                                await navigator.clipboard.writeText(copyText);
                                setCopiedMomentId(moment.id);
                                setTimeout(() => setCopiedMomentId(null), 2000);
                              } catch (err) {
                                console.error("Failed to copy:", err);
                              }
                            }}
                            className="flex items-center gap-1.5 rounded-lg bg-slate-500/20 px-3 py-1.5 text-xs font-medium text-slate-400 hover:bg-slate-500/30 transition-colors"
                            title="Copy to clipboard"
                          >
                            {copiedMomentId === moment.id ? (
                              <Check className="h-3 w-3 text-green-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                            {copiedMomentId === moment.id ? "Copied!" : "Copy"}
                          </button>

                          {/* Generate Video Clip Button */}
                          <button
                            onClick={async () => {
                              setMoments(prev => prev.map(m =>
                                m.id === moment.id ? { ...m, generatingVideo: true } : m
                              ));

                              try {
                                const response = await fetch("/api/clip/video", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    youtubeUrl: moment.streamUrl,
                                    startTime: 0,
                                    duration: 30,
                                  }),
                                });

                                const data = await response.json();

                                if (data.success) {
                                  setMoments(prev => prev.map(m =>
                                    m.id === moment.id ? {
                                      ...m,
                                      videoClipGenerated: true,
                                      videoClipInfo: { size: data.size, duration: data.duration },
                                      videoClipDownloadUrl: data.downloadUrl,
                                      generatingVideo: false
                                    } : m
                                  ));
                                } else {
                                  setMoments(prev => prev.map(m =>
                                    m.id === moment.id ? { ...m, generatingVideo: false } : m
                                  ));
                                }
                              } catch (error) {
                                console.error("Error generating video:", error);
                                setMoments(prev => prev.map(m =>
                                  m.id === moment.id ? { ...m, generatingVideo: false } : m
                                ));
                              }
                            }}
                            disabled={moment.generatingVideo || moment.videoClipGenerated}
                            className="flex items-center gap-1.5 rounded-lg bg-orange-500/20 px-3 py-1.5 text-xs font-medium text-orange-400 hover:bg-orange-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Generate 30-second video clip"
                          >
                            {moment.generatingVideo ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : moment.videoClipGenerated ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Video className="h-3 w-3" />
                            )}
                            {moment.generatingVideo
                              ? "Generating..."
                              : moment.videoClipGenerated
                              ? `${moment.videoClipInfo?.size || "Done"}`
                              : "Video Clip"}
                          </button>

                          {/* TikTok Export Button */}
                          <button
                            onClick={async () => {
                              setMoments(prev => prev.map(m =>
                                m.id === moment.id ? { ...m, generatingVideo: true } : m
                              ));

                              try {
                                const response = await fetch("/api/export", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    youtubeUrl: moment.streamUrl,
                                    startTime: 0,
                                    duration: 15,
                                    platform: "tiktok",
                                  }),
                                });

                                const data = await response.json();
                                setMoments(prev => prev.map(m =>
                                  m.id === moment.id ? { ...m, generatingVideo: false } : m
                                ));

                                if (data.success) {
                                  alert(`${data.platformName}-ready clip created!\n\n${data.size} • ${data.resolution}\n\nOpen TikTok and upload the clip when ready!`);
                                }
                              } catch (error) {
                                console.error("Error exporting:", error);
                                setMoments(prev => prev.map(m =>
                                  m.id === moment.id ? { ...m, generatingVideo: false } : m
                                ));
                              }
                            }}
                            disabled={moment.generatingVideo}
                            className="flex items-center gap-1.5 rounded-lg bg-pink-600/20 px-3 py-1.5 text-xs font-medium text-pink-400 hover:bg-pink-600/30 transition-colors disabled:opacity-50"
                            title="Export for TikTok (9:16 vertical)"
                          >
                            <span className="text-xs font-bold">TikTok</span>
                          </button>

                          {/* YouTube Shorts Export Button */}
                          <button
                            onClick={async () => {
                              setMoments(prev => prev.map(m =>
                                m.id === moment.id ? { ...m, generatingVideo: true } : m
                              ));

                              try {
                                const response = await fetch("/api/export", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    youtubeUrl: moment.streamUrl,
                                    startTime: 0,
                                    duration: 15,
                                    platform: "youtube",
                                  }),
                                });

                                const data = await response.json();
                                setMoments(prev => prev.map(m =>
                                  m.id === moment.id ? { ...m, generatingVideo: false } : m
                                ));

                                if (data.success) {
                                  alert(`${data.platformName}-ready clip created!\n\n${data.size} • ${data.resolution}\n\nOpen YouTube Studio and upload as a Short!`);
                                }
                              } catch (error) {
                                console.error("Error exporting:", error);
                                setMoments(prev => prev.map(m =>
                                  m.id === moment.id ? { ...m, generatingVideo: false } : m
                                ));
                              }
                            }}
                            disabled={moment.generatingVideo}
                            className="flex items-center gap-1.5 rounded-lg bg-red-600/20 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-600/30 transition-colors disabled:opacity-50"
                            title="Export for YouTube Shorts (9:16 vertical)"
                          >
                            <span className="text-xs font-bold">Shorts</span>
                          </button>
                        </div>

                        {/* Video Clip Info */}
                        {moment.videoClipGenerated && moment.videoClipInfo && (
                          <div className="mt-2 rounded-lg bg-orange-500/10 px-3 py-2 text-xs">
                            <div className="flex items-center gap-3 text-orange-400">
                              <Check className="h-3 w-3" />
                              <span>Video ready! {moment.videoClipInfo.size} • {moment.videoClipInfo.duration}s</span>
                              {moment.videoClipDownloadUrl && (
                                <button
                                  onClick={() => {
                                    const link = document.createElement("a");
                                    link.href = moment.videoClipDownloadUrl;
                                    link.download = `clipbot-clip-${moment.id}.mp4`;
                                    link.click();
                                  }}
                                  className="flex items-center gap-1 rounded bg-orange-500/20 px-2 py-1 hover:bg-orange-500/30 transition-colors"
                                  title="Download video clip"
                                >
                                  <Download className="h-3 w-3" />
                                  Download
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* GIF Preview */}
                        {moment.gif && (
                          <div className="mt-3 rounded-lg overflow-hidden bg-slate-950">
                            <img
                              src={`data:image/gif;base64,${moment.gif}`}
                              alt="Generated GIF"
                              className="w-full h-auto"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
