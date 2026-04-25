import { requireUser } from "@/lib/http";
import { json } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SteamSummary = {
  steamid: string;
  personaname?: string;
  profileurl?: string;
  avatar?: string;
  avatarmedium?: string;
  avatarfull?: string;
  communityvisibilitystate?: number;
  profilestate?: number;
  lastlogoff?: number;
  timecreated?: number;
  loccountrycode?: string;
};

type SteamBan = {
  SteamId: string;
  CommunityBanned?: boolean;
  VACBanned?: boolean;
  NumberOfVACBans?: number;
  DaysSinceLastBan?: number;
  NumberOfGameBans?: number;
  EconomyBan?: string;
};

export async function GET(request: Request) {
  const base = requireUser(request);
  if (base.response) return base.response;

  const key = process.env.STEAM_WEB_API_KEY || "";
  const url = new URL(request.url);
  const ids = Array.from(new Set((url.searchParams.get("ids") || "").split(",").map((id) => id.trim()).filter(Boolean))).slice(0, 100);
  if (!ids.length) return json({ profiles: {}, configured: Boolean(key) });
  if (!key) return json({ profiles: {}, configured: false, reason: "STEAM_WEB_API_KEY is not configured" });

  const steamids = ids.join(",");
  const summariesUrl = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${encodeURIComponent(key)}&steamids=${encodeURIComponent(steamids)}`;
  const bansUrl = `https://api.steampowered.com/ISteamUser/GetPlayerBans/v1/?key=${encodeURIComponent(key)}&steamids=${encodeURIComponent(steamids)}`;

  const [summariesResponse, bansResponse] = await Promise.all([
    fetch(summariesUrl, { cache: "no-store" }).catch(() => null),
    fetch(bansUrl, { cache: "no-store" }).catch(() => null)
  ]);

  const summaries = summariesResponse?.ok ? ((await summariesResponse.json()).response?.players || []) as SteamSummary[] : [];
  const bans = bansResponse?.ok ? ((await bansResponse.json()).players || []) as SteamBan[] : [];
  const bansById = new Map(bans.map((ban) => [ban.SteamId, ban]));

  const profiles = Object.fromEntries(summaries.map((profile) => {
    const ban = bansById.get(profile.steamid);
    return [profile.steamid, {
      steamId: profile.steamid,
      name: profile.personaname || "",
      profileUrl: profile.profileurl || `https://steamcommunity.com/profiles/${profile.steamid}`,
      avatar: profile.avatar || "",
      avatarMedium: profile.avatarmedium || profile.avatar || "",
      avatarFull: profile.avatarfull || profile.avatarmedium || profile.avatar || "",
      visibility: profile.communityvisibilitystate || 0,
      profileState: profile.profilestate || 0,
      countryCode: profile.loccountrycode || "",
      createdAt: profile.timecreated ? profile.timecreated * 1000 : null,
      lastLogoffAt: profile.lastlogoff ? profile.lastlogoff * 1000 : null,
      bans: ban ? {
        communityBanned: Boolean(ban.CommunityBanned),
        vacBanned: Boolean(ban.VACBanned),
        numberOfVacBans: Number(ban.NumberOfVACBans || 0),
        daysSinceLastBan: Number(ban.DaysSinceLastBan || 0),
        numberOfGameBans: Number(ban.NumberOfGameBans || 0),
        economyBan: ban.EconomyBan || "none"
      } : null
    }];
  }));

  return json({ profiles, configured: true });
}
