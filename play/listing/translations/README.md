# Play listing translations (Music ConnectZ)

One file per language: `TITLE:` / `SHORT:` / `FULL:`, ready to paste into Play Console → Store listings. File names are Play locale codes. `en-US.txt` is the source and matches `../title.txt`, `../short-description.txt`, `../full-description.txt`.

- **Titles have no emoji** — Play does not allow emoji in an app title. They are keyword titles (AI coach, collab, battle where it fits) held to the 30-character limit; short ≤ 80, full ≤ 4000. A script checked all 51 files.
- **Emoji** are in the short description, section headings and feature bullets.
- **Z plurals** (`PriceZ`-style) are applied to English and to English loanwords kept in other languages (take, cypher, battle). Native-language plurals keep their own grammar.
- **Brand and product names** (PostZ, BattleZ, SpinaZ, PromptZ, BADGEZ, StatZ…) are never translated.
- Machine translation, not reviewed by a native speaker. Play may not offer every locale (Hausa `ha` and Yoruba `yo` are the likely gaps); use "Manage languages" to see what your console lists.
