# Type ConnectZ Quiz Plan (Corey-voice)

## 1. Quiz Structure
- 16 types (e.g., ENFP, ISTJ, etc.)
- 4 dichotomies: E/I, S/N, T/F, J/P
- 12-20 playful, relatable questions (multiple choice, 2 options per dichotomy)
- Each answer maps to one side of a dichotomy
- Results: playful Corey-voice type name, emoji, and description

## 2. Results & Descriptions (Corey-voice)
- Each type gets a custom, fun description (e.g., “ENFP: The Hype Machine 🎉”)
- Results page: type, emoji, description, and Corey-voice encouragement
- Option to share result or keep private

## 3. Integration
- Save result to user profile (backend model: type_connectz_type, type_connectz_result_date)
- Show type on profile (optional privacy toggle)
- Filter/match users by type in collab search
- Quiz available as a pre-app and in onboarding

## 4. Backend/API
- Add type_connectz_type field to UserProfile
- API endpoints: save/get user Type ConnectZ result

## 5. Frontend/UI
- Quiz UI: questions, progress bar, Corey-voice commentary
- Results UI: type, emoji, description, share button
- Profile UI: show/hide type, filter by type

## 6. Version History Entry (draft)
v15.7 (planned)
- Type ConnectZ: New MBTI-style personality quiz (Corey-voice, 16 types, 4 dichotomies)
- Results saved to profile, shown on onboarding and profile (with privacy controls)
- Filter/match users by type in collab search and other pre-apps
- Playful, original questions and results—no copyright drama, just pure fun!
