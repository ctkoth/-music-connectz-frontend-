# Notes for the Play reviewer — paste into App access / reviewer instructions

Edit the two credential lines, then paste everything below the rule.

---

SkillZ is a coach for seven instruments — voice, rap, guitar, bass, keys, violin and drums —
behind one sign-in. It needs an account, so reviewers can sign in with:

    Username: REPLACE_WITH_A_REAL_REVIEW_ACCOUNT
    Password: REPLACE_WITH_ITS_PASSWORD

(That account needs to be a real one on production, with the day's free prompts unspent.
It gets 3 free prompts a day, one per scored take, and they renew every day. Every coach
answers "isn't switched on yet" if the server's GEMINI_API_KEY is missing — check it before
submitting. ANTHROPIC_API_KEY is for the second check on the advice; without it the screen
says "listener's notes only" and the take is still scored.)

How to try it with no instrument to hand:
- Open any coach, press **Record a take** (Chrome asks for the microphone — allow it),
  talk or hum for ten seconds, press Stop, then **Send it to the coach**. Or press
  **Attach audio or video** and pick any audio or video file on the phone. A recording with
  no playing in it is not given a low score — the coach says it found no performance, and
  it isn't charged.
- A take the coach can't read isn't charged. Scoring takes up to about two minutes at worst,
  and then says so rather than spinning.

Where to look:
- Home: every coach, whether it is switched on, what it scores a take on, and what a take
  costs — before you open it. The bottom of Home states what leaves the device.
- Any coach: the price sits under **Send it to the coach**, after a take is recorded and
  before it is sent. Each score shows its name beside its number, then what worked, what to
  fix and one drill, and the line saying what one take can and cannot show.
- Under every score: **Report this output**, which goes to the owner's moderation queue.
- Your history (under the recorder): consistency, health and goal match, worked out from
  the takes you've had scored, each saying what is missing when it can't be measured.
- DrumZ: a beat pad with two kits above the coach.
- Bottom of any screen → "Delete my account": in-app account deletion.
  Web page for the same thing: https://musicconnectz.net/delete-account.html
- Bottom of any screen → Privacy policy: https://musicconnectz.net/privacy.html

AI disclosures:
- The recording is sent to Google's Gemini API to be listened to and scored. What Gemini
  reports about it — as text, not the recording — goes to Anthropic's Claude API, with a
  short summary of the member's earlier scores, to check the advice. Claude never hears the
  take. Neither gets the member's name, username or email from us. The screens say, on every
  coach, that the score is written by AI and can be wrong, and the Home screen's *What leaves
  your device* spells out the rest.
- Every score has "Report this output".
- We do not store the recording. We store the scores, what the coach heard and wrote, and
  the genre and date, on the account; the member can delete everything by deleting the
  account.

What the app does not do:
- No purchases, no payments, no ads, no subscriptions — nothing in it sells anything. Out of
  free prompts the screens say they renew tomorrow (a member who already holds PromptZ from
  Music ConnectZ sees the take priced in PromptZ first).
- No sharing with other members: no feed, no messages, no comments, no profiles. A score
  can't be posted or shared from this app.
- The microphone and camera are used only when the member presses Record (Chrome asks the
  first time; the app's manifest declares no Android permissions). Nothing records before
  that, and moving to another coach stops a recording in progress.
- No location, contacts or health-sensor access. No third-party sign-in.
- DJ, producer, A&R, illustration and video coaches appear on the app icon but are not
  built; Home says "Not built yet" and there is nothing to open.

Stored data: the account, the scores and notes for each take, the goals and ranges the
member sets. One caution that the policy also states: each scored take has a score page
(score, verdict, genre, username) that opens for anybody who has its link — this app never
shows or shares that link.
