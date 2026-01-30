const TWITCH_HELIX = "https://api.twitch.tv/helix";

export interface TwitchStream {
  id: string;
  user_id: string;
  user_name: string;
  user_login: string;
  game_id: string;
  game_name: string;
  type: "live" | "";
  title: string;
  viewer_count: number;
  started_at: string;
  language: string;
  thumbnail_url: string;
  is_mature: boolean;
}

export interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
  type: string;
  broadcaster_type: string;
  description: string;
  profile_image_url: string;
  offline_image_url: string;
  view_count: number;
  created_at: string;
}

/**
 * Extract channel name from Twitch URL
 */
export function extractChannelName(url: string): string | null {
  // twitch.tv/username
  const match1 = url.match(/twitch\.tv\/([^\/\?]+)/);
  if (match1) return match1[1];

  // www.twitch.tv/username
  const match2 = url.match(/www\.twitch\.tv\/([^\/\?]+)/);
  if (match2) return match2[2];

  return null;
}

/**
 * Get stream information for a channel
 * Note: Requires Twitch Client ID and App Access Token
 * For demo purposes, this returns mock data
 */
export async function getStreamInfo(
  channelName: string,
  clientId?: string,
  accessToken?: string
): Promise<TwitchStream | null> {
  if (!clientId || !accessToken) {
    // Return mock data for demo
    return {
      id: "mock-stream-id",
      user_id: "mock-user-id",
      user_name: channelName,
      user_login: channelName.toLowerCase(),
      game_id: "",
      game_name: "Just Chatting",
      type: "live",
      title: `${channelName} is live! Come hang out!`,
      viewer_count: Math.floor(Math.random() * 10000) + 100,
      started_at: new Date().toISOString(),
      language: "en",
      thumbnail_url: `https://static-cdn.jtvnw.net/jtv_user_pictures/${channelName}-profile_image-70x70.png`,
      is_mature: false,
    };
  }

  const response = await fetch(
    `${TWITCH_HELIX}/streams?user_login=${channelName}`,
    {
      headers: {
        "Client-Id": clientId,
        "Authorization": `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Twitch API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data?.[0] || null;
}

/**
 * Get user information
 */
export async function getUserInfo(
  channelName: string,
  clientId?: string,
  accessToken?: string
): Promise<TwitchUser | null> {
  if (!clientId || !accessToken) {
    // Return mock data for demo
    return {
      id: "mock-user-id",
      login: channelName.toLowerCase(),
      display_name: channelName,
      type: "user",
      broadcaster_type: "",
      description: "Welcome to my stream!",
      profile_image_url: `https://static-cdn.jtvnw.net/jtv_user_pictures/${channelName}-profile_image-70x70.png`,
      offline_image_url: "",
      view_count: Math.floor(Math.random() * 1000000),
      created_at: new Date().toISOString(),
    };
  }

  const response = await fetch(
    `${TWITCH_HELIX}/users?login=${channelName}`,
    {
      headers: {
        "Client-Id": clientId,
        "Authorization": `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Twitch API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data?.[0] || null;
}

/**
 * Get stream thumbnail URL
 */
export function getStreamThumbnail(
  thumbnailUrl: string,
  width: number = 320,
  height: number = 180
): string {
  // Twitch thumbnails use {width}x{height} placeholders
  return thumbnailUrl.replace("{width}", width.toString()).replace("{height}", height.toString());
}
