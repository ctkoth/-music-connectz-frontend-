// Every platform SocialZ link-detection knows a logo for. Keys MUST match
// apps/economy/social_verify.py's KNOWN_SERVICES (and whatever the AI
// fallback there returns) — this is the client half of that one registry;
// an unrecognized key falls back to a generic globe rather than a blank.
import { Facebook, Github, Globe, Instagram, Music2, Twitch, Youtube } from "lucide-react";
import { GoogleG, LinkedIn, Spotify, SoundCloud, XTwitter } from "./auth/oauthProviders.jsx";

const TikTok = (p) => (
  <svg viewBox="0 0 24 24" width={p.size} height={p.size} fill={p.color || "currentColor"}>
    <path d="M16.6 5.1c-1-.9-1.6-2.2-1.6-3.6h-3.2v14.3c0 1.6-1.3 2.9-2.9 2.9s-2.9-1.3-2.9-2.9 1.3-2.9 2.9-2.9c.3 0 .6 0 .9.1V9.7c-.3 0-.6-.1-.9-.1-3.4 0-6.2 2.8-6.2 6.2s2.8 6.2 6.2 6.2 6.2-2.8 6.2-6.2V8.5c1.3.9 2.9 1.5 4.6 1.5V6.8c-1 0-1.9-.3-2.7-.8-.2-.1-.3-.2-.4-.3z"/>
  </svg>
);
const Discord = (p) => (
  <svg viewBox="0 0 24 24" width={p.size} height={p.size} fill={p.color || "currentColor"}>
    <path d="M20.3 5.4A18 18 0 0 0 15.6 4c-.2.4-.5.9-.6 1.3a16.7 16.7 0 0 0-5 0A8.6 8.6 0 0 0 9.4 4a18 18 0 0 0-4.7 1.4C1.9 9.1 1.2 12.8 1.5 16.4a18 18 0 0 0 5.5 2.7c.4-.6.8-1.3 1.1-2a11.6 11.6 0 0 1-1.8-.8l.4-.3a12.9 12.9 0 0 0 10.6 0l.4.3c-.6.3-1.2.6-1.8.8.3.7.7 1.4 1.1 2a18 18 0 0 0 5.5-2.7c.4-4.2-.7-7.9-2.2-11zM8.7 14.1c-.8 0-1.5-.8-1.5-1.7s.7-1.7 1.5-1.7 1.5.8 1.5 1.7-.7 1.7-1.5 1.7zm6.6 0c-.8 0-1.5-.8-1.5-1.7s.7-1.7 1.5-1.7 1.5.8 1.5 1.7-.7 1.7-1.5 1.7z"/>
  </svg>
);
const Patreon = (p) => (
  <svg viewBox="0 0 24 24" width={p.size} height={p.size} fill={p.color || "currentColor"}>
    <circle cx="15" cy="8.5" r="6.5"/><rect x="2" y="2" width="3.5" height="20"/>
  </svg>
);
const Bandcamp = (p) => (
  <svg viewBox="0 0 24 24" width={p.size} height={p.size} fill={p.color || "currentColor"}>
    <path d="M2 17.5h9.4L21 6.5h-9.4z"/>
  </svg>
);
const Threads = (p) => (
  <svg viewBox="0 0 24 24" width={p.size} height={p.size} fill="none" stroke={p.color || "currentColor"} strokeWidth="1.8">
    <path d="M12 2c5 0 8.5 3 8.5 9v2c0 5-3.5 9-8.5 9s-8.5-4-8.5-9v-2c0-6 3.5-9 8.5-9z"/>
    <path d="M9 10c0-1.7 1.3-3 3-3 2 0 3.3 1.3 3.3 3.3 0 3-2.3 3.7-4 3.7-2.2 0-3.8 1-3.8 3S9 20 12 20c2.5 0 4.3-1.3 4.7-3.5"/>
  </svg>
);

export const SERVICES = {
  spotify:     { label: "Spotify",     Icon: Spotify,     color: "#1DB954" },
  soundcloud:  { label: "SoundCloud",  Icon: SoundCloud,  color: "#FF5500" },
  youtube:     { label: "YouTube",     Icon: Youtube,     color: "#FF0000" },
  instagram:   { label: "Instagram",   Icon: Instagram,   color: "#E1306C" },
  tiktok:      { label: "TikTok",      Icon: TikTok,      color: "#ffffff" },
  twitter:     { label: "Twitter / X", Icon: XTwitter,    color: "#ffffff" },
  facebook:    { label: "Facebook",    Icon: Facebook,    color: "#1877F2" },
  bandcamp:    { label: "Bandcamp",    Icon: Bandcamp,    color: "#1DA0C3" },
  apple_music: { label: "Apple Music", Icon: Music2,      color: "#FA243C" },
  discord:     { label: "Discord",     Icon: Discord,     color: "#5865F2" },
  twitch:      { label: "Twitch",      Icon: Twitch,      color: "#9146FF" },
  patreon:     { label: "Patreon",     Icon: Patreon,     color: "#FF424D" },
  linkedin:    { label: "LinkedIn",    Icon: LinkedIn,    color: "#0A66C2" },
  github:      { label: "GitHub",      Icon: Github,      color: "#ffffff" },
  threads:     { label: "Threads",     Icon: Threads,     color: "#ffffff" },
  google:      { label: "Google",      Icon: GoogleG,     color: "#ffffff" },
  website:     { label: "Website",     Icon: Globe,       color: "#8b9bb4" },
};
// Alias: apps/economy/models.py's older LINK_PROVIDERS (PlaylistZ's own
// domain-detection, predating social_verify.py's KNOWN_SERVICES) spells
// Apple Music "apple". Same platform, one icon — the alias lives here so no
// caller has to remember which registry it's asking.
SERVICES.apple = SERVICES.apple_music;

export const serviceFor = (key) => SERVICES[key] || SERVICES.website;
