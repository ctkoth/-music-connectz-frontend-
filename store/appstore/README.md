# App Store listing translations (Music ConnectZ)

One file per App Store Connect locale: NAME (≤30), SUBTITLE (≤30), PROMOTIONAL TEXT (≤170), KEYWORDS (≤100, comma-separated, no spaces), DESCRIPTION (≤4000). A script checked every file against those limits. `en-US.txt` is the source.

- **Same copy as the Play listing** (`play/listing/translations/`): name, promotional text (the Play short description) and description are identical, so the two stores never say different things. Emoji are in the promotional text and description, **not** in the name or subtitle — Apple can reject emoji in an app name.
- **Z plurals** apply to English and kept English loanwords, as on Play. **Keywords use plain forms** ("beats", not "beatz"): a search for "beats" does not find "beatz".
- Keywords are one list per language and are my picks, not researched volumes. Don't repeat the app name or category in them (Apple ignores it).
- **Apple does not offer every language here.** Not selectable as App Store locales: Swahili `sw`, Persian `fa`, Burmese `my`, Hausa `ha`, Filipino `fil`, Nepali `ne`, Sinhala `si`, Amharic `am`, Yoruba `yo`, Zulu `zu`, Bulgarian `bg`, Serbian `sr`. Those files are here for completeness; the rest map to Apple locales (`es-MX`, `zh-Hans`, `zh-Hant`, `ar-SA`, `he`, `no`…). Check the dropdown in App Store Connect — Apple adds languages over time.
- Machine translation, not reviewed by a native speaker.
