import { purposeOf } from '../appPurpose.js';
import VersionBadge from "./VersionBadge.jsx";
import React, { useState } from 'react';
import NeedsView from './NeedsView.jsx';
import { goToSpot } from '../goto.js';
import { presetDirectzFormat } from '../directzPreset.js';
import { canMini, pathFor } from '../App.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { IconImg, tabKeys, tabMeta } from '../App.jsx';
import { readStore } from '../PickConnectZ.jsx';
import { LAST_KEY, PINS_KEY, USAGE_KEY, hasOwnApps, rankApps, readSeeds } from '../yourApps.js';
import { FOCUS_MODE, FOCUS_COACHES, FOCUS_COACH_PARENTS, FOCUS_PARENTS, FOCUS_SUPPORT, HOME_APPS, HOME_PARENTS, HOME_FEATURED } from '../focus.js';
import './ToolZMenu.css';

// Each tile draws through the SAME registry key the tab strip uses (App.jsx
// TABS), via IconImg — Corey's own artwork first, the generated glyph only as
// the backup. This menu used to keep its own path list, which pointed VenueZ
// at the OpportunitieZ glyph and MercheZ at SoundZ's, and never saw the custom
// art at all. A third copy of "which picture is this app" is how that happens.
const ICON_KEY = {
  singz: "singz.png", rapz: "rapz.png", guitarz: "guitarz.png", bassz: "bassz.png",
  keyz: "keyz.png", drumz: "drumz.png", producez: "producez.png", violinz: "violinz.png",
  flutez: "flutez.png", saxz: "saxz.png", clarinetz: "clarinetz.png", trumpetz: "trumpetz.png",
  battlez: "battlez.png", collabz: "collabz.png", infernoz: "infernoz.png",
  socialiZeZ: "social_connectz.png", vybez: "vybez.png", postz: "postz.png",
  messagez: "messagez.png", skillz: "skillz.png", occ: "occ.png", bosttake: "coachz.jpg",
  onboardz: "onboardz.png", logz: "logz.png", profilez: "profilez.png", voicez: "voicez.png",
  widgetz: "playlistz.png", keyconnectz: "keyconnectz.png", venuez: "venuez.png",
  directz: "directz.png", statez: "statsz.png", funnelz: "funnelz.png", groupz: "groupz.png",
  budgetz: "budgetz.jpg", merchz: "merchz.png", beatz: "beatz.png", lilith: "lilithz.png", bodiez: "bodiez.png", lookmaxz: "lookmaxz.png",
  journalz: "journalz.jpg", metz: "metz.jpg", tunerz: "tunerz.jpg", chordz: "chordz.jpg", breathz: "breathz.png", viewz: "viewz.png",
  intelligencez: "intelligencez.png", mixconnectz: "mixconnectz.png", imageconnectz: "imageconnectz.png", videoconnectz: "videoconnectz.png",
  instrumentalconnectz: "instrumentalconnectz.png", sentenceconnectz: "sentencez.png",
  membershipz: "money.png", preferencez: "preferencez.png", substancez: "substancez.png", zodiacz: "zodiacz.png", facez: "facez.png", personaz: "personaz.png", distributez: "distributez.png", ratez: "ratez.png", sonday: "sonday.png", parcel: "parcel.png", royaltiez: "royaltiez.png",
  reelz: "reelz.png", episodez: "episodez.png", moviez: "moviez.png",
  mangaz: "mangaz.png", designz: "designz.png", mixez: "mixez.png", animez: "animez.png", animeconnectz: "animeconnectz.png", characterz: "characterz.png", voicezstylez: "voicezstylez.png",
  sentencez: "sentencez_editor.png", videoz: "videoz.png", imagez: "imagez.png", arsenal: "arsenal.png", witchcraft: "witchcraft.png", azrael: "azrael.png", dawz: "dawz.png", gamez: "gamez.png", lookmaxz: "lookmaxz.png",
  // FileZ had art registered in App.jsx's ICONS and no entry here, so its home tile fell back to a
  // music note and the raw key — the registry knowing a picture is not this menu knowing it.
  filez: "filez.png",
};
const EMOJI = {
  singz: "🎤", rapz: "🎙️", guitarz: "🎸", bassz: "🎸", keyz: "🎹", drumz: "🥁", producez: "🎚️", violinz: "🎻", flutez: "🪈", saxz: "🎷", clarinetz: "🎼", trumpetz: "🎺",
  battlez: "⚔️", collabz: "🤝", infernoz: "🔥", socialiZeZ: "👥", vybez: "💫", postz: "📝",
  messagez: "💬", skillz: "⭐", occ: "👨‍🏫", bosttake: "🎬", onboardz: "🚀", logz: "📊",
  profilez: "👤", voicez: "🎙️", widgetz: "🔗", keyconnectz: "🔑", venuez: "🎪", directz: "🎥", statez: "📈",
  budgetz: "💰", funnelz: "📉", groupz: "👫", merchz: "🛍️", beatz: "🎹", lilith: "💃", bodiez: "💪", lookmaxz: "✨", journalz: "📔",
  membershipz: "💳", metz: "🎚️", tunerz: "🎯", chordz: "🎼", breathz: "🫁", viewz: "👁️",
  intelligencez: "🧠", mixconnectz: "🎛️", imageconnectz: "🖼️", videoconnectz: "🎬", instrumentalconnectz: "🎹", sentenceconnectz: "✍️",
  preferencez: "💞", substancez: "🧠", zodiacz: "♈", reelz: "🎞️", episodez: "📺", moviez: "🎥",
  mangaz: "📚", designz: "🎨", mixez: "🎚️", animez: "🌸", animeconnectz: "🌸", characterz: "🦁", voicezstylez: "🗣️", sentencez: "✍️", videoz: "🎞️", imagez: "🖼️", arsenal: "⚔️", witchcraft: "🔮", azrael: "☠️", dawz: "🎛️", gamez: "🎮",
  filez: "🗂️",
};

// One app, several doors: CharacterZ and VoiceZ StyleZ sit under DesignZ AND
// DirectZ (and VoiceZ StyleZ under MangaZ's group), because a character is
// drawn in one place and directed in another. Same key, same app — listing it
// twice is a second door, never a second copy.
const IMAGEZ = { key: 'imagez', label: 'ImageZ', color: 'cyan', desc: 'Layered image editor like Photoshop — layers, blend modes, adjustments, brush & crop, pen pressure for Wacom; free' };
const CHARACTERZ = { key: 'characterz', label: 'CharacterZ', color: 'cyan', desc: 'FaceZ with PersonalitieZ, and a voice' };
const VOICEZ_STYLEZ = { key: 'voicezstylez', label: 'VoiceZ StyleZ', color: 'magenta', desc: 'Voices for your CharacterZ', soon: true };

// Flatten apps from grouped structure
const flattenApps = (categoryData) => {
  if (!Array.isArray(categoryData)) return [];

  const result = [];
  categoryData.forEach(item => {
    if (item.group && item.apps) {
      result.push(...item.apps);
    } else if (item.key) {
      result.push(item);
    }
  });
  return result;
};

// "N ready · M coming soon" — what a group actually holds. An app listed twice
// (one app, several doors) counts once, and only a built one counts as ready.
const countLine = (apps, unit = false) => {
  const seen = new Map();
  apps.forEach((a) => { if (!seen.has(a.key) || !a.soon) seen.set(a.key, !!a.soon); });
  const soon = [...seen.values()].filter(Boolean).length;
  const ready = seen.size - soon;
  const noun = unit ? (ready === 1 ? 'app' : 'apps') : '';
  return `${ready}${noun ? ` ${noun}` : ''} ready${soon ? ` · ${soon} coming soon` : ''}`;
};

// App categories and configuration
// The instrument coaches live under BOTH ToolZ and SkillZ — one list, so
// the two menus can never disagree about what a coach is.
const COACH_GROUPS = [
    {
      group: 'Vocal Instruments',
      apps: [
        { key: 'singz', label: 'SingZ', color: 'cyan', desc: 'Reach your voice' },
        { key: 'rapz', label: 'RapZ', color: 'magenta', desc: 'Flow with purpose' },
      ]
    },
    {
      group: 'String & Keys',
      apps: [
        { key: 'guitarz', label: 'GuitarZ', color: 'yellow', desc: 'Guitar coaching' },
        { key: 'bassz', label: 'BassZ', color: 'green', desc: 'Bass coaching' },
        { key: 'keyz', label: 'KeyZ', color: 'cyan', desc: 'Keyboard coaching' },
        { key: 'violinz', label: 'ViolinZ', color: 'yellow', desc: 'String instrument coaching' },
        { key: 'flutez', label: 'FluteZ', color: 'cyan', desc: 'Flute coaching — breath and tone scored' },
        { key: 'saxz', label: 'SaxZ', color: 'orange', desc: 'Saxophone coaching — breath and tone scored' },
        { key: 'clarinetz', label: 'ClarinetZ', color: 'purple', desc: 'Clarinet coaching — breath and tone scored' },
        { key: 'trumpetz', label: 'TrumpetZ', color: 'orange', desc: 'Trumpet coaching — breath and tone scored' },
      ]
    },
    {
      group: 'Percussion',
      apps: [
        { key: 'drumz', label: 'DrumZ', color: 'magenta', desc: 'Drums coaching' },
        { key: 'producez', label: 'ProduceZ', color: 'magenta', desc: 'Producer coaching' },
      ]
    },
];

const TOOLZ_MENU = {
  'SocialiZeZ': [
    {
      group: 'Discovery',
      apps: [
        { key: 'socialiZeZ', tab: 'social', label: 'SocialiZeZ', color: 'magenta', desc: 'Connect & find your level' },
        { key: 'vybez', label: 'VybeZ', color: 'cyan', desc: 'Find your frequency' },
        { key: 'ratez', label: 'Rate ConnectZ', color: 'gold', desc: 'Rate work and earn ⚡ — and see every rating you have, by kind' },
      ]
    },
    {
      group: 'Quick Connect',
      apps: [
        { key: 'infernoz', label: 'InfernoZ', color: 'orange', desc: 'Short-term projects, and dating for 18+', soon: true },
      ]
    },
    {
      group: 'Share & Communicate',
      apps: [
        { key: 'postz', label: 'PostZ', color: 'green', desc: 'Share & connect' },
        { key: 'messagez', label: 'MessageZ', color: 'yellow', desc: 'Connect meaningfully' },
        { key: 'parcel', label: 'Parcel Primate', color: 'orange', desc: 'A newsletter to your followers — post, DM, and email for whoever wants it' },
      ]
    },
  ],
  'CollabZ': [
    { key: 'collabz', label: 'CollabZ', color: 'cyan', desc: 'Build together, get better' },
  ],
  'BattleZ': [
    { key: 'battlez', label: 'BattleZ', color: 'red', desc: 'Face off & level up' },
  ],
  'GroupZ': [
    { key: 'groupz', label: 'GroupZ', color: 'cyan', desc: 'Belong & grow together' },
  ],
  'ToolZ': [
    // The coaches live in SkillZ (Corey: "SkillZ has the coaches"); ToolZ is the tools around them.
    {
      group: 'Practice Tools',
      apps: [
        { key: 'metz', label: 'MetZ', color: 'gold', desc: 'Metronome — tempo, time signature, subdivisions' },
        { key: 'tunerz', label: 'TunerZ', color: 'cyan', desc: 'Tune any instrument by ear' },
        { key: 'chordz', label: 'ChordZ', color: 'magenta', desc: 'Chords, progressions & voicings' },
        { key: 'breathz', label: 'BreathZ', color: 'cyan', desc: 'Free breath training — box, long exhale, bar breathing' },
        { key: 'journalz', label: 'JournalZ', color: 'yellow', desc: 'A private practice diary' },
        { key: 'budgetz', label: 'BudgetZ', color: 'green', desc: 'Planner for finances — free by hand, StatZ links your bank' },
      ]
    },
    {
      group: 'Editors',
      apps: [
        { key: 'sentencez', label: 'SentenceZ', color: 'cyan', desc: 'Text editor — write, and the writing coach scores your lyrics' },
        { key: 'videoz', label: 'VideoZ', color: 'magenta', desc: 'Multitrack video editor like Sony Vegas — your videos, photos & audio in order, filters, FX, titles, free; lip-sync is StatZ' },
        IMAGEZ,
        IMAGEZ,
        { key: 'arsenal', label: 'Arsenal', color: 'yellow', desc: 'Multitrack DAW like Pro Tools — record takes, playlists, edit, mix with built-in effects, bounce a WAV; free' },
        { key: 'dawz', label: 'DawZ', color: 'cyan', desc: 'Every DAW we are building — open one, vote for the next' },
      ]
    },
    {
      group: 'DirectZ',
      apps: [
        { key: 'directz', label: 'DirectZ', color: 'cyan', desc: 'Post a video into its length band' },
        // DirectZ's children BY LENGTH — the three bands the server enforces.
        { key: 'reelz', tab: 'directz', preset: 'reelz', label: 'ReelZ', color: 'magenta', desc: '30 seconds to 30 minutes' },
        { key: 'episodez', tab: 'directz', preset: 'episodez', label: 'EpisodeZ', color: 'cyan', desc: '30 to 60 minutes' },
        { key: 'moviez', tab: 'directz', preset: 'moviez', label: 'MovieZ', color: 'magenta', desc: '1 to 3 hours' },
        CHARACTERZ,
        VOICEZ_STYLEZ,
      ]
    },
    {
      group: 'Release & Earn',
      apps: [
        { key: 'beatz', label: 'BeatZ', color: 'purple', desc: 'License beats from producers, or sell your own' },
        { key: 'distributez', label: 'DistributeZ', color: 'cyan', desc: 'Your posts and collabs become releases — Free sends 1 a month' },
        { key: 'royaltiez', label: 'RoyaltieZ', color: 'gold', desc: 'What your releases earn, and cashing it out' },
      ]
    },
    {
      group: 'Progress & Analytics',
      apps: [
        { key: 'logz', label: 'LogZ', color: 'yellow', desc: 'Transaction history & ledger' },
        { key: 'viewz', label: 'ViewZ', color: 'cyan', desc: 'Who viewed your posts & profile — a DAW timeline (StatZ)' },
      ]
    },
    {
      group: 'Utilities',
      apps: [
        { key: 'widgetz', tab: 'profilez', label: 'WidgetZ', color: 'magenta', desc: 'Your links open on screen — add them in ProfileZ' },
        { key: 'keyconnectz', label: 'KeyConnectZ', color: 'green', desc: 'Transcribe & read-aloud' },
      ]
    },
    {
      group: 'Plan & train',
      apps: [
        { key: 'lilith', label: 'Lilith', color: 'magenta', desc: 'Apple Things-style productivity with XP-based streaks' },
        { key: 'bodiez', label: 'BodieZ', color: 'orange', desc: 'Strength training, body transformation & workout planning' },
        { key: 'sonday', label: 'Sonday', color: 'gold', desc: 'Boards for your projects — drafts to released, shared with your team' },
      ],
    },
  ],
  'SkillZ': [
    ...COACH_GROUPS,
    {
      // Designers' skill is shown by the work: DesignZ is where it is put up to be rated, reacted to and commented on.
      group: 'Designers',
      apps: [
        { key: 'designz', label: 'DesignZ', color: 'magenta', desc: 'Post your design work — members rate it, react and comment' },
      ]
    },
    {
      group: 'Progression',
      apps: [
        { key: 'skillz', category: 'SkillZ', label: 'SkillZ', color: 'gold', desc: 'Every coach and its skill tree' },
      ]
    },
  ],
  'IntelligenceZ': [
    {
      // `soon` replaces the Open buttons with a label: an app is listed when it
      // is not built so the suite is visible, never as a door that opens onto
      // nothing. Mix ConnectZ was here as `soon` until its screen existed; it
      // does now, so it is a door like the rest.
      group: 'AI Creation',
      apps: [
        // The hub reads what each app costs, and whether it is switched on,
        // from the server — so it comes first, where the question starts.
        { key: 'intelligencez', label: 'IntelligenceZ', color: 'magenta', desc: 'Every IntelligenceZ app in one place — what each costs before you open it, and your newest pieces from all of them' },
        { key: 'sentenceconnectz', label: 'Sentence ConnectZ', color: 'magenta', desc: 'Resumes, cover letters, lyrics, poems, bios, posts & essays' },
        { key: 'instrumentalconnectz', label: 'Instrumental ConnectZ', color: 'yellow', desc: 'MIDI loops by genre, instruments, BPM & key — StatZ searches keys by mood' },
        { key: 'mixconnectz', label: 'Mix ConnectZ', color: 'cyan', desc: 'Master a finished song on your device — measured loudness, tone and peaks, free' },
        { key: 'imageconnectz', label: 'Image ConnectZ', color: 'magenta', desc: 'Covers, profile & promo pictures, banners and backgrounds from your FaceZ' },
        { key: 'facez', label: 'FaceZ', color: 'cyan', desc: 'The faces Video ConnectZ can star' },
        { key: 'videoconnectz', label: 'Video ConnectZ', color: 'cyan', desc: 'Music, bio & promo videos, starring your FaceZ' },
        { key: 'animeconnectz', label: 'Anime ConnectZ', color: 'magenta', desc: 'AI anime from your CharacterZ: PromptZ, ReelZ, EpisodeZ chapters and MovieZ scenes' },
      ]
    },
    {
      group: 'AI Coaching',
      apps: [
        { key: 'occ', label: 'Ocular Code ConnectZ', color: 'magenta', desc: 'OCC — chat with Claude about what you are building; you pick the engine and see its price first' },
        { key: 'bosttake', tab: 'singz', label: 'BossTake', color: 'cyan', desc: 'Record & submit takes to a coach' },
      ]
    },
    {
      group: 'Getting Started',
      apps: [
        { key: 'onboardz', label: 'OnboardZ', color: 'green', desc: 'Get started guide' },
      ]
    },
  ],
  'ProfileZ': [
    {
      group: 'Your Profile',
      apps: [
        { key: 'profilez', label: 'ProfileZ', color: 'cyan', desc: 'Edit your profile' },
        { key: 'voicez', label: 'VoiceZ', color: 'magenta', desc: 'Your voices — and which one the coach, the writer and OCC speak in' },
        // LookZMaxZ had a route and no door — reachable only by typing its address. Corey's
        // art files it under ProfileZ (profilez.lookzmaxz.jpg). Adults only: the screen
        // refuses an unverified member with the server's sentence.
        { key: 'lookmaxz', label: 'LookZMaxZ', color: 'magenta', desc: '18+: hair, skin, teeth and styling rated 1-10 from a photo, with what to do about each' },
      ]
    },
    {
      group: 'Members by metric',
      apps: [
        { key: 'preferencez', label: 'PreferenceZ', color: 'magenta', desc: 'Who members are attracted to (18+)' },
        { key: 'substancez', label: 'SubstanceZ', color: 'green', desc: 'What members use, and how often (18+)' },
        { key: 'personaz', label: 'PersonaZ', color: 'magenta', desc: 'Every persona and skill — yours with start dates, or find who else has them' },
        { key: 'facez', label: 'FaceZ', color: 'cyan', desc: 'Faces for your AI videos — and rate others (18+)' },
        { key: 'zodiacz', label: 'ZodiacZ', color: 'yellow', desc: 'Every sign, its members, and today\'s horoscope' },
      ]
    },
  ],
  'DesignZ': [
    {
      group: 'Draw & create',
      apps: [
        IMAGEZ,
        { key: 'mangaz', label: 'MangaZ', color: 'magenta', desc: 'Manga pages from your CharacterZ and your idea' },
        { key: 'mixez', label: 'MixEZ', color: 'yellow', desc: 'Mix-engineer ear training — find the boosted frequency, match a hidden EQ; free, on your device' },
    { key: 'animez', label: 'AnimeZ', color: 'cyan', desc: 'Episodes from your manga pages and anime pieces — subtitles, camera moves, cut in VideoZ' },
        CHARACTERZ,
        VOICEZ_STYLEZ,
      ]
    },
  ],
  'VenueZ': [
    { key: 'venuez', label: 'VenueZ', color: 'orange', desc: 'Discover venues' },
  ],
  'MercheZ': [
    { key: 'merchz', label: 'MercheZ', color: 'magenta', desc: 'Sell and buy from other creators — legal goods only' },
  ],
  'Lilith': [
    { key: 'lilith', label: 'Lilith', color: 'magenta', desc: 'Apple Things-style productivity with XP-based streaks' },
  ],
  // Corey: DawZ, MangaZ and AnimeZ on one screen — make music, draw it, animate it.
  'StudioZ': [
    { key: 'dawz', label: 'DawZ', color: 'cyan', desc: 'Every DAW on one engine — tap an icon to open it as a tab, split window or new window' },
    { key: 'mangaz', label: 'MangaZ', color: 'magenta', desc: 'Manga pages from your CharacterZ and your idea' },
    { key: 'animez', label: 'AnimeZ', color: 'cyan', desc: 'Episodes from your manga pages and anime pieces — subtitles, camera moves, cut in VideoZ' },
  ],
  'BodieZ': [
    { key: 'bodiez', label: 'BodieZ', color: 'orange', desc: 'Strength training, body transformation & workout planning' },
  ],
};

const CATEGORY_ICON_KEY = {
  SocialiZeZ: "social_connectz.png", CollabZ: "collabz.png", BattleZ: "battlez.png",
  GroupZ: "groupz.png", SkillZ: "skillz.png", ToolZ: "toolz.png", IntelligenceZ: "intelligencez.png",
  ProfileZ: "profilez.png", DesignZ: "designz.png", VenueZ: "venuez.png", MercheZ: "merchz.png",
  Lilith: "lilithz.png", BodieZ: "bodiez.png", StudioZ: "dawz.png",
};

// Category info for the main grid
const CATEGORIES = [
  { key: 'SocialiZeZ', label: 'SocialiZeZ', color: 'magenta' },
  { key: 'CollabZ', label: 'CollabZ', color: 'cyan' },
  { key: 'BattleZ', label: 'BattleZ', color: 'red' },
  { key: 'GroupZ', label: 'GroupZ', color: 'cyan' },
  { key: 'SkillZ', label: 'SkillZ', color: 'magenta' },
  { key: 'ToolZ', label: 'ToolZ', color: 'yellow' },
  { key: 'IntelligenceZ', label: 'IntelligenceZ', color: 'magenta' },
  { key: 'ProfileZ', label: 'ProfileZ', color: 'cyan' },
  { key: 'DesignZ', label: 'DesignZ', color: 'magenta' },
  { key: 'VenueZ', label: 'VenueZ', color: 'orange' },
  { key: 'MercheZ', label: 'MercheZ', color: 'magenta' },
  { key: 'Lilith', label: 'Lilith', color: 'magenta' },
  { key: 'BodieZ', label: 'BodieZ', color: 'orange' },
  { key: 'StudioZ', label: 'StudioZ', color: 'cyan' },
];

// Labels for the focus tiles that no ToolZ category names (see focus.js).
const FOCUS_LABEL = {
  singz: 'SingZ', rapz: 'RapZ', guitarz: 'GuitarZ', bassz: 'BassZ', keyz: 'KeyZ',
  drumz: 'DrumZ', producez: 'ProduceZ', violinz: 'ViolinZ', flutez: 'FluteZ', saxz: 'SaxZ', clarinetz: 'ClarinetZ', trumpetz: 'TrumpetZ', postz: 'PostZ', profilez: 'ProfileZ',
  messagez: 'MessageZ', battlez: 'BattleZ', metz: 'MetZ', tunerz: 'TunerZ',
  chordz: 'ChordZ', breathz: 'BreathZ', membershipz: 'MembershipZ', onboardz: 'OnboardZ', logz: 'LogZ',
  bodiez: 'BodieZ', filez: 'FileZ', lilith: 'Lilith', imagez: 'ImageZ', mangaz: 'MangaZ', animez: 'AnimeZ', dawz: 'DawZ', gamez: 'GameZ', lookmaxz: 'LookZMaxZ',
};

function FocusTile({ appKey, onOpen, big }) {
  return (
    <button className={`category-card ${big ? 'cyan coach-card' : 'magenta'}`} onClick={() => onOpen(appKey)}>
      {ICON_KEY[appKey] ? (
        <IconImg icon={ICON_KEY[appKey]} alt={FOCUS_LABEL[appKey]} className="category-icon-img"
                 fallback={<span>{EMOJI[appKey] || '🎵'}</span>} />
      ) : (
        <span style={{ fontSize: 28 }}>{EMOJI[appKey] || '🎵'}</span>
      )}
      <div className="category-text">
        <div className="category-label">{FOCUS_LABEL[appKey] || appKey}</div>
        {big && purposeOf(appKey) && <div className="category-tag">{purposeOf(appKey)}</div>}
      </div>
    </button>
  );
}

// A PARENT: opens the whole ToolZ category (every app under it, with Open / Window / Split), not one
// app. Same card the "More apps" grid draws, lifted to the front.
// "Your apps": the member's own, from what they pin and open (yourApps.js, kept on the device).
function yourAppsNow() {
  const opts = { usage: readStore(USAGE_KEY) || {}, last: readStore(LAST_KEY) || {}, pins: readStore(PINS_KEY) || [],
                 seeds: readSeeds(), exclude: ['toolz'], valid: tabKeys() };
  return { apps: rankApps({ ...opts, limit: 8 }), own: hasOwnApps(opts) };
}

function YourAppTile({ appKey, onOpen }) {
  const t = tabMeta(appKey);
  if (!t) return null;
  return (
    <button className="category-card cyan" onClick={() => onOpen(appKey)}>
      <IconImg icon={t.icon} alt={t.label} className="category-icon-img"
               fallback={<span style={{ fontSize: 28 }}>{EMOJI[appKey] || '🎵'}</span>} />
      <div className="category-label">{t.label}</div>
    </button>
  );
}

function ParentTile({ categoryKey, onOpen, big }) {
  const c = CATEGORIES.find((x) => x.key === categoryKey);
  if (!c) return null;
  return (
    <button className={`category-card ${c.color}${big ? ' coach-card' : ''}`} onClick={() => onOpen(categoryKey)}>
      <IconImg icon={CATEGORY_ICON_KEY[categoryKey]} alt={c.label} className="category-icon-img" />
      {big ? (
        <div className="category-text">
          <div className="category-label">{c.label}</div>
          {c.desc && <div className="category-tag">{c.desc}</div>}
        </div>
      ) : <div className="category-label">{c.label}</div>}
    </button>
  );
}

function FeaturedSkillZ({ onOpen }) {
  const c = CATEGORIES.find((x) => x.key === HOME_FEATURED);
  if (!c) return null;
  const coaches = FOCUS_COACHES.filter((k) => ['singz', 'rapz', 'guitarz', 'drumz', 'keyz', 'bassz'].includes(k));
  return (
    <button type="button" data-tour="home-skillz" onClick={() => onOpen(HOME_FEATURED)}
            aria-label="SkillZ — every coach and its skill tree"
            className="category-card magenta"
            style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16, width: '100%', textAlign: 'left', padding: 14, marginBottom: 14 }}>
      <IconImg icon={CATEGORY_ICON_KEY[HOME_FEATURED]} alt="" className="category-icon-img !h-24 !w-24 shrink-0 !rounded-2xl sm:!h-36 sm:!w-36" />
      <span style={{ minWidth: 0 }}>
        <span className="category-label" style={{ display: 'block', fontSize: '1.5rem' }}>{c.label}</span>
        <span style={{ display: 'block', fontSize: 13, opacity: 0.8, margin: '4px 0 8px' }}>
          Every coach and its skill tree — score a take, watch the number move.
        </span>
        <span style={{ display: 'block', fontSize: 12, opacity: 0.65 }}>
          {coaches.map((k) => TABS_LABEL[k] || k).join(' · ')} and more →
        </span>
      </span>
    </button>
  );
}
const TABS_LABEL = { singz: 'SingZ', rapz: 'RapZ', guitarz: 'GuitarZ', drumz: 'DrumZ', keyz: 'KeyZ', bassz: 'BassZ' };

export default function ToolZMenu() {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState(null);
  // Focus mode: the coach leads and the thirteen categories wait behind one
  // tap. They are all still here — see focus.js for why they are not offered.
  const [showMore, setShowMore] = useState(!FOCUS_MODE);
  // "What I need" is an alternative way in, not a second layout: one icon home
  // for everybody, and a collapsed search beside it. Per-device, so storage failing changes nothing.
  const [showNeeds, setShowNeeds] = useState(false);
  const openFocus = (key) => goToSpot(key, `${key}:main`);
  // Read once per visit to the home screen: what this member uses leads, the rest folds away.
  const [mine] = useState(yourAppsNow);
  const [showAll, setShowAll] = useState(false);
  const [hoveredApp, setHoveredApp] = useState(null);

  // Where a tile goes. Most tiles ARE a tab; some are a door into one (a
  // DirectZ length band, the coach that takes a Boss Take) or into another
  // ToolZ category. Every key here was checked against App.jsx's TABS — a
  // tile whose key is not a tab is a button that does nothing.
  const tabOf = (app) => app.tab || app.key;
  const handleAppClick = (app) => {
    if (app.category) { setSelectedCategory(app.category); return; }
    if (app.preset) presetDirectzFormat(app.preset);
    goToSpot(tabOf(app), `${tabOf(app)}:main`);
  };

  const handleOpenOption = (app, openType) => {
    if (openType === 'window') {
      // `//rapz` is a protocol-relative URL — it opened a HOST called rapz.
      if (app.preset) presetDirectzFormat(app.preset);
      window.open(pathFor(tabOf(app)), '_blank', 'noopener');
    } else if (openType === 'split') {
      if (app.preset) presetDirectzFormat(app.preset);
      window.dispatchEvent(new CustomEvent('mcz-split', { detail: tabOf(app) }));
    } else {
      handleAppClick(app);
    }
  };

  if (selectedCategory) {
    const apps = flattenApps(TOOLZ_MENU[selectedCategory]);
    const category = CATEGORIES.find(c => c.key === selectedCategory);

    return (
      <div className="toolz-menu-container">
        <div className="toolz-header">
          <button
            className="back-button"
            onClick={() => setSelectedCategory(null)}
          >
            ← Back
          </button>
          <div className="toolz-icon-main">
            <IconImg icon={CATEGORY_ICON_KEY[category.key]} alt={category.label} className="category-icon-img" />
          </div>
          <h1>{category.label}</h1>
        </div>

        <div className="apps-detail-grid">
          {/* Built apps first: a "coming soon" card above a working one is a
              door that opens onto nothing getting the best seat in the house. */}
          {[...apps.filter((a) => !a.soon), ...apps.filter((a) => a.soon)].map((app) => (
            <div key={app.key} className={`app-detail-card ${app.color}${app.soon ? ' soon' : ''}`}>
              <div className="app-detail-header">
                <div className="app-icon-small">
                  {ICON_KEY[app.key] ? (
                    <IconImg icon={ICON_KEY[app.key]} alt={app.label}
                      fallback={<span>{EMOJI[app.key] || "🎵"}</span>} />
                  ) : (
                    <span>{EMOJI[app.key] || "🎵"}</span>
                  )}
                </div>
                <div className="app-detail-info">
                  <h3>{app.label}</h3>
                  <p>{app.desc}</p>
                </div>
              </div>

              {app.soon ? (
                <div className="app-open-options">
                  <span className="open-btn" aria-disabled="true">Coming soon</span>
                </div>
              ) : (
              <div className="app-open-options">
                <button
                  className="open-btn open-default"
                  onClick={() => handleAppClick(app)}
                  title="Open in current view"
                >
                  ▶ Open
                </button>
                <button
                  className="open-btn open-window"
                  onClick={() => handleOpenOption(app, 'window')}
                  title="Open in new window"
                >
                  ⧉ Window
                </button>
                <button
                  className="open-btn open-split"
                  onClick={() => handleOpenOption(app, 'split')}
                  title="Open in split view"
                >
                  ⊞ Split
                </button>
                {canMini(tabOf(app), user?.tier) && (
                  <button
                    className="open-btn open-split"
                    onClick={() => window.dispatchEvent(new CustomEvent('mcz-mini', { detail: tabOf(app) }))}
                    title="Dock it small beside any app — up to three at once"
                  >
                    ◱ Mini
                  </button>
                )}
              </div>
              )}
            </div>
          ))}
        </div>

        {/* Counts only what is built. "7 Tools" over a group with two doors
            that open onto nothing is a number that flatters the group, and the
            ⚡ that decorated "Ready to use" is the Energy resource — it is
            not a lightning bolt. */}
        <div className="toolz-stats">
          <div className="stat-item">
            <span className="stat-icon">📱</span>
            <span>{countLine(apps)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="toolz-menu-container">
      <div className="toolz-header">
        <img src="/logo.png?v=2" alt="Music ConnectZ" className="toolz-mcz-logo" />
        <h1>MusicConnectZ.Net</h1>
        <p className="toolz-subtitle">
          {FOCUS_MODE ? '🎤 Score a take. Send it again. Watch the number move.' : '🧰 Every app, one place'}
        </p>
      </div>

      {FOCUS_MODE && (
        <>
          <button className="toolz-more-button" aria-expanded={showNeeds} onClick={() => setShowNeeds((v) => !v)}>
            {showNeeds ? 'Hide: find an app by what I need' : '🔎 Find an app by what I need'}
          </button>
          {showNeeds && <NeedsView onOpen={openFocus} />}
        </>
      )}

      {/* One home: your apps (once you have some), then every coach and tool in one grid.
          Everything else is one tap behind More apps. */}
      {FOCUS_MODE && mine.apps.length > 0 && (
        <>
          <p className="toolz-subtitle" style={{ marginBottom: 8 }} data-tour="your-apps">Your apps</p>
          <div className="category-grid">
            {mine.apps.map((k) => <YourAppTile key={k} appKey={k} onOpen={openFocus} />)}
          </div>
        </>
      )}

      {FOCUS_MODE && (
        <>
          <div className="category-grid coach-grid" data-tour="home-pinned" style={{ margin: '14px 0' }}>
            {/* ToolZ and DawZ lead. The coaches live in SkillZ now (a tab on the profile), so they are not tiles here. */}
            <ParentTile categoryKey="ToolZ" onOpen={setSelectedCategory} big />
            <FocusTile appKey="dawz" onOpen={openFocus} big />
            <ParentTile categoryKey="IntelligenceZ" onOpen={setSelectedCategory} big />
          </div>
          <div className="category-grid" style={{ margin: '14px 0' }}>
            {FOCUS_PARENTS.filter((k) => k !== "ToolZ" && k !== "IntelligenceZ").map((k) => <ParentTile key={k} categoryKey={k} onOpen={setSelectedCategory} />)}
            {/* Lilith and BodieZ are in ToolZ ("Plan & train"), so they are not tiles here. */}
            {FOCUS_SUPPORT.filter((k) => !["dawz", "bodiez", "lilith"].includes(k)).map((k) => <FocusTile key={k} appKey={k} onOpen={openFocus} />)}
          </div>
          <button className="toolz-more-button" aria-expanded={showMore} onClick={() => setShowMore((v) => !v)}>
            {showMore ? 'Hide the other apps' : `More apps (${CATEGORIES.length} categories)`}
          </button>
        </>
      )}

      {/* Category Grid */}
      {showMore && (
      <div className="category-grid">
        {CATEGORIES.map((category) => (
          <button
            key={category.key}
            className={`category-card ${category.color}`}
            onClick={() => setSelectedCategory(category.key)}
          >
            <IconImg icon={CATEGORY_ICON_KEY[category.key]} alt={category.label} className="category-icon-img" />
            <div className="category-label">{category.label}</div>
          </button>
        ))}
      </div>
      )}

      <p className="mt-6 pb-2 text-center"><VersionBadge /></p>
    </div>
  );
}
