#!/usr/bin/env bash
# Normalize your icon files into public/icons/ with registry names.
#
# IT COPIES. Point SRC at a folder OUTSIDE the repo — a source folder, your
# OneDrive icons directory, wherever the art actually lives. Pointing it at
# public/icons itself leaves the messy original beside the clean copy, both
# get committed, and the deploy ships the same image twice under two names.
# That is exactly what happened: 57 byte-identical pairs, cleaned up in the
# commit that added this warning. Run `node tools/icon-audit.mjs` afterwards.
#   bash RENAME_ICONS.sh ~/path/to/your/icons/folder
# Converts jpg->png names as-is (the app serves them fine either way; keep the
# extension in the DEST name — browsers read content, but consistent .png keys
# are what the registry expects, so jpgs are copied under .png names).
SRC="${1:?usage: bash RENAME_ICONS.sh /path/to/icons}"
DST="public/icons"
mkdir -p "$DST"
copy(){ [ -f "$SRC/$1" ] && cp "$SRC/$1" "$DST/$2" && echo "OK  $1 -> $2" || echo "--  missing: $1"; }
copy "Arsenal icon .jpg" "arsenal.png"
copy "azrael icon .jpg" "azrael.png"
copy "Battle Cypher.jpg" "battlez.png"
copy "BoardZ icon.jpg" "boardz.png"
copy "BodieZ icon.jpg" "bodiez.png"
copy "bugz icon .jpg" "bugz.png"
copy "Callz. Ai.png" "callz_ai.png"
copy "Callz. User.png" "callz_user.png"
copy "Callz icon.jpg" "callz.png"
copy "Clean ConnectZ icon new .png" "cleanconnectz.png"
copy "collabz.coverz.png" "coverz.png"
copy "Collabz.Orginalz .png" "collabz_originalz.png"
copy "collabz.Remixez .png" "collabz_remixez.png"
copy "Crewz icon.jpg" "crewz.png"
copy "Dawz.FormulaWon .jpg" "dawz_formulawon.png"
copy "Dawz .jpg" "dawz.png"
copy "designz.png" "designz.png"
copy "developz.png" "developz.png"
copy "directz.png" "directz.png"
copy "Energy.png" "energy.png"
copy "Facez icon.jpg" "facez.png"
copy "fruity Mobius icon .jpg" "fruity_mobius.png"
copy "groupz. fanZ.png" "groupz_fanz.png"
copy "Groupz. FriendZ.png" "groupz_friendz.png"
copy "groupz.blocked .png" "groupz_blocked.png"
copy "groupz.custom.png" "groupz_custom.png"
copy "Groupz icon.jpg" "groupz.png"
copy "Homez icon .jpg" "homez.png"
copy "Imagez icon .jpg" "imagez.png"
copy "Inbox .jpg" "inbox.png"
copy "Inbox icon .jpg" "inbox_alt.png"
copy "Intelligence.jpg" "intelligence.png"
copy "Intuition icon .jpg" "intuition.png"
copy "Keyconnectz icon .png" "keyconnectz.png"
copy "Labelz icon.jpg" "labelz.png"
copy "lessonz.png" "lessonz.png"
copy "lilith.anytime.png" "lilith_anytime.png"
copy "lilith.logbook.png" "lilith_logbook.png"
copy "lilith.today2.png" "lilith_today2.png"
copy "lilith.today.png" "lilith_today.png"
copy "lilith.upcoming.png" "lilith_upcoming.png"
copy "Lilith trash.png" "lilith_trash.png"
copy "toolz.lilith.png" "toolz_lilith.png"
copy "Manager icon .jpg" "personaz_manager.png"
copy "ManageZ.png" "managez.png"
copy "MessageZ.jpg" "messagez.png"
copy "messagez.outbox.png" "messagez_outbox.png"
copy "mimez.png" "mimez.png"
copy "mix engineer icon .jpg" "personaz_mixengineer.png"
copy "mixeZ.png" "mixez.png"
copy "Music ConnectZ background  .png" "background.png"
copy "Ocular code connectz icon .png" "occ.png"
copy "personaz_director.png" "personaz_director.png"
copy "personaz_director.webp" "personaz_director.webp"
copy "personaz_mime.png" "personaz_mime.png"
copy "Personaz. A&r scout .jpg" "personaz_arscout.png"
copy "Personaz. Designer.png" "personaz_designer.png"
copy "personaz. independent artist.jpg" "personaz_indieartist.png"
copy "Personaz. Producer.png" "personaz_producer.png"
copy "Personaz.Developer.jpg" "personaz_developer.png"
copy "Personaz.GhostWriter.jpg" "personaz_ghostwriter.png"
copy "pickconz_optimized.jpg" "pickconz.png"
copy "preferencez.jpg" "preferencez.png"
copy "producez.png" "producez.png"
copy "RapZ icon .jpg" "rapz.png"
copy "Royaltiez icon .jpg" "royaltiez.png"
copy "S distributez icon .jpg" "distributez.png"
copy "scoutz.png" "scoutz.png"
copy "Sentencez icon .png" "sentencez.png"
copy "shotz.png" "shotz.png"
copy "Singz .jpg" "singz.png"
copy "social ConnectZ .jpg" "social_connectz.png"
copy "Socialz icon.jpg" "socialz.png"
copy "Sonday.jpg" "sonday.png"
copy "spinaz.coin .jpg" "spinaz.png"
copy "SubstanceZ.png" "substancez.png"
copy "Trump toupee icon .jpg" "trump_toupee.png"
copy "Venuez icon.jpg" "venuez.png"
copy "Venuez icon .jpg" "venuez_alt.png"
copy "Videographer icon .jpg" "personaz_videographer.png"
copy "Witchcraft icon .jpg" "witchcraft.png"
copy "writez.png" "writez.png"
copy "ZodiacZ.png" "zodiacz.png"
copy "Callz. Ai.png" "callz_ai.png"
copy "Callz. User.png" "callz_user.png"
# ---- The neon signs Corey pasted into chat on Sep 13 -------------------------
# An image in a chat message is not a file — it never reaches the repo — so
# these five have to come off the machine they live on. Destination names are
# what src/App.jsx already asks for, so dropping them in is the whole job.
#
# CoachZ, MetZ, TunerZ and ChordZ each replace a fallback: CoachZ is showing
# the MCZ logo right now, and the other three are on a generated -neon.svg.
# Point the registry path back at the real file once each lands — the key is
# already right.
copy "CoachZ.jpg"     "coachz.jpg"      # -> registry already says /icons/coachz.jpg
copy "toolz.metz.jpg" "metz.jpg"        # -> registry says metz-neon.svg AND key "metz.png"; both move to .jpg
copy "tunerz.jpg"     "tunerz.jpg"      # -> registry says tunerz-neon.svg
copy "chordz.jpg"     "chordz.jpg"      # -> registry says chordz-neon.svg
# RecordingZ has no tab and no registry key in this build — the art has
# nowhere to be rendered yet, so this only parks it.
copy "recordingz.jpg" "recordingz.jpg"

echo done
