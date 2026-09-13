#!/usr/bin/env bash
# Import your icon artwork into public/icons/ under the names the registry
# actually asks for.
#
#   bash RENAME_ICONS.sh /path/to/folder/with/the/art
#
# On Windows use Git Bash and FORWARD slashes:
#   bash RENAME_ICONS.sh "/c/Users/ctkot/OneDrive/Documents/mcz-icons"
#
# IT COPIES, it does not move. Point SRC at a folder OUTSIDE the repo. Pointing
# it at public/icons leaves the messy original beside the clean copy, both get
# committed, and the deploy ships the same image twice under two names — that
# is exactly what happened once already: 57 byte-identical pairs. The guard
# below refuses that case rather than trusting anyone to remember.
#
# MATCHING IS FUZZY ON PURPOSE. The names on the left are the ones the art had
# when this list was written, trailing spaces and all ("Arsenal icon .jpg").
# Requiring an exact match meant one renamed file printed "missing" and copied
# nothing, which is the whole reason this script kept appearing to do nothing.
# So a source is found by its name with case, spaces, dots, dashes and
# underscores ignored: "CoachZ.jpg", "coachz.jpg" and "Coach Z .jpg" all hit
# the same line. Two files that normalise the same way are AMBIGUOUS and
# neither is copied — a wrong icon copied silently is worse than one not
# copied loudly.
#
# THE DESTINATION EXTENSION IS THE REAL FORMAT. This used to copy jpgs under
# .png names on the theory that browsers read content not extensions. True,
# but the registry keys are filenames, and four of them (chordz, tunerz, metz,
# journalz) were .png against .jpg art — so the file landed and the icon still
# did not appear. Keys and destinations now agree; do not "tidy" a .jpg back
# to .png here.
#
# Afterwards:  npm test  &&  node tools/icon-audit.mjs
SRC="${1:?usage: bash RENAME_ICONS.sh /path/to/icons}"
DST="public/icons"

# The mistake that made 57 duplicates, refused rather than documented.
if [ "$(cd "$SRC" 2>/dev/null && pwd -P)" = "$(cd "$DST" 2>/dev/null && pwd -P)" ]; then
  echo "REFUSED: the source folder IS public/icons. Copy the art somewhere else first," >&2
  echo "         or every file lands twice — once under each name." >&2
  exit 1
fi
[ -d "$SRC" ] || { echo "No such folder: $SRC" >&2; exit 1; }
mkdir -p "$DST"

ok=0; missing=0; ambiguous=0
# Lowercase, and drop everything that is not a letter or a digit.
norm(){ printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | tr -cd '[:alnum:]'; }

copy(){
  want=$(norm "${1%.*}")
  found=""; hits=0
  for f in "$SRC"/*; do
    [ -f "$f" ] || continue
    base=${f##*/}
    case "$base" in *.png|*.PNG|*.jpg|*.JPG|*.jpeg|*.JPEG|*.webp|*.WEBP|*.svg|*.SVG) ;; *) continue ;; esac
    [ "$(norm "${base%.*}")" = "$want" ] || continue
    found=$f; hits=$((hits + 1))
  done
  if [ "$hits" -gt 1 ]; then
    echo "??  ambiguous: $hits files look like '$1' — none copied"; ambiguous=$((ambiguous + 1)); return
  fi
  if [ -z "$found" ]; then
    echo "--  missing:   $1"; missing=$((missing + 1)); return
  fi
  cp "$found" "$DST/$2" && echo "OK  ${found##*/} -> $2" && ok=$((ok + 1))
}

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
copy "toolz.metz.jpg" "metz.jpg"        # -> registry says metz-neon.svg; key is already metz.jpg
copy "tunerz.jpg"     "tunerz.jpg"      # -> registry says tunerz-neon.svg
copy "chordz.jpg"     "chordz.jpg"      # -> registry says chordz-neon.svg
# RecordingZ has no tab and no registry key in this build — the art has
# nowhere to be rendered yet, so this only parks it.
copy "recordingz.jpg" "recordingz.jpg"

# The remaining four the audit still reports. With these, every registry entry
# that is missing art has a line here, so one run imports the lot.
copy "journalz.jpg"        "journalz.jpg"        # -> registry says journalz-neon.svg
copy "personaz.coach.jpg"  "personaz_coach.jpg"  # -> underscored, like every personaz_<role>
copy "statsz.png"          "statsz.png"
copy "opportunitiez.png"   "opportunitiez.png"

echo
echo "copied $ok · missing $missing · ambiguous $ambiguous"
echo "next:  npm test  &&  node tools/icon-audit.mjs"
