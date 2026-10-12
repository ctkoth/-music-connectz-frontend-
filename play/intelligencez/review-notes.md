# Notes for the Play reviewer — paste into App access / reviewer instructions

Edit the two credential lines, then paste everything below the rule.

---

IntelligenceZ is four tools that stand alone — Write, Chat, Compose and Master — behind
one sign-in. It needs an account, so reviewers can sign in with:

    Username: REPLACE_WITH_A_REAL_REVIEW_ACCOUNT
    Password: REPLACE_WITH_ITS_PASSWORD

(That account needs to be a real one on production, with the day's free prompts
unspent. It gets 3 free prompts a day, shared by Write, Chat and Compose, and they
renew every day. Write, Chat and Compose answer "isn't switched on yet" if the
server's GEMINI_API_KEY or ANTHROPIC_API_KEY is missing — check both before
submitting.)

Where to look:
- Home: every app, whether it is switched on, and what a run costs — before you open it.
  The bottom of Home states what leaves the device.
- Write → Resume: the price sits beside the Write it button, and the screen says whose
  voice the piece is written in. A resume is written only from what is typed; anything
  missing becomes a [BRACKETED] blank.
- Chat: the engine list with each engine's price, and the price beside Send.
- Compose: pick instruments, tempo and key; the price sits beside Compose it. Preview
  plays simple built-in sounds; Download .mid saves the notes.
- Master: pick any audio file from the phone. It is measured and mastered on the device
  — nothing is uploaded — and each move is listed with the measurement behind it. Play
  compares the master with the original at matched loudness. Download WAV keeps it on
  the device. Save to Your masters is the only thing that uploads anything.
- Bottom of any screen → "Delete my account": in-app account deletion.
  Web page for the same thing: https://musicconnectz.net/delete-account.html
- Bottom of any screen → Privacy policy: https://musicconnectz.net/privacy.html

AI disclosures:
- Write and Compose send what the member types to Google's Gemini API. Chat sends the
  message and the recent turns of the conversation to Anthropic's Claude API. None of
  them gets the member's name, username or email from us.
- Write and Chat have "Report this output" on every piece or reply, which goes to the
  owner's moderation queue. The screens say, on the screen, that the output is written
  by AI and can be wrong.
- Mastering uses no AI model. It is measured signal processing, and the screen says so.

What the app does not do:
- No purchases, no payments, no ads, no subscriptions — nothing in it sells anything.
  Out of free prompts the screens say they renew tomorrow.
- No image or video generation.
- No sharing with other members: no feed, no messages, no comments, no profiles.
- No camera, microphone, location, contacts or health-sensor access, and no Android
  permissions. Mix ConnectZ reads a file the member picks with the system file picker.
- No third-party sign-in.

Stored data: the account, what the member typed into Write and Compose and what came
back, replies the member keeps from Chat, and masters the member saves. One caution
that the policy also states: a saved master's link opens without signing in, for
anybody who has the link.
