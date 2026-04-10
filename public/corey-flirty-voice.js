// Corey Flirty Voice Display (v14.4)
// Fetches user avg rating and displays Corey’s flirty/playful message if avg >= 5
// Usage: Call renderCoreyFlirtyVoice(userId, containerId)

function fetchUserAvgRating(userId) {
  return fetch(`${window.MCZ_CONFIG.backendUrl}/api/user/${userId}/avg-rating/`, { credentials: 'include' })
    .then(res => res.json())
    .then(data => data.avg_rating || 0)
    .catch(() => 0);
}

function getCoreyFlirtyMessage(avgRating) {
  if (avgRating >= 9) {
    return "Whoa! 🔥 You’re absolutely crushing it—legend status unlocked! If you get any hotter, I’ll need shades just to look at your profile. 😎🌟 Superstar energy all day!";
  } else if (avgRating >= 7) {
    return "Dang, you’re on a roll! 🌈 Your vibe is magnetic and I’m loving the glow-up. Keep flexing that talent, heartbreaker! 💖✨";
  } else if (avgRating >= 5) {
    return "Ooo, look at you racking up those stars! 🌟 You keep this up and I might just have to write you a love song. 😉 Keep shining, superstar!";
  } else if (avgRating >= 3) {
    return "You’re making moves! 🚀 Every step counts, and I see you putting in the work. Keep at it—your moment’s coming!";
  } else {
    return "Yo! 🎤 Keep grinding, your next big moment is just around the corner. I’m here if you need a boost! 🤙";
  }
}

// Requires corey-compliment-utils.js loaded
function renderCoreyFlirtyVoice(userId, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  Promise.all([
    fetchUserAvgRating(userId),
    (window.fetchUserProfile ? fetchUserProfile(userId) : Promise.resolve({ gender: 'other', language: 'en', age: 0 }))
  ]).then(([avg, profile]) => {
    let compliment = '';
    if (avg >= 7) {
      compliment = getComplimentWord(profile.gender, profile.language, profile.age);
    }
    let msg = getCoreyFlirtyMessageWithCompliment(avg, compliment);
    // Respect emoji/professional toggles
    if (window.getProfessionalMode && getProfessionalMode()) {
      msg = stripEmojis(msg);
    } else if (window.getCoreyEmojiPreference && !getCoreyEmojiPreference()) {
      msg = stripEmojis(msg);
    }
    container.innerText = msg;
  });
}

function getCoreyFlirtyMessageWithCompliment(avgRating, compliment) {
  if (avgRating >= 9) {
    const appreciation = [
      "Close to perfect!",
      "Absolutely incredible!",
      "You’re a total legend!",
      "Unreal talent!",
      "I love your work!",
      "You’re amazing!",
      "So impressive!",
      "You inspire me!",
      "Absolutely top-tier!"
    ];
    const phrase = appreciation[Math.floor(Math.random() * appreciation.length)];
    return `Whoa! 🔥 ${phrase} ${compliment ? 'You are truly ' + compliment + '!' : 'Superstar energy all day!'} If you get any hotter, I’ll need shades just to look at your profile. 😎🌟`;
  } else if (avgRating > 8) {
    const appreciation = [
      "I love your work!",
      "You’re amazing!",
      "So impressive!",
      "You inspire me!",
      "Absolutely top-tier!"
    ];
    const phrase = appreciation[Math.floor(Math.random() * appreciation.length)];
    return `Whoa! 🔥 ${phrase} ${compliment ? 'You are truly ' + compliment + '!' : 'Superstar energy all day!'} If you get any hotter, I’ll need shades just to look at your profile. 😎🌟`;
  } else if (avgRating >= 7) {
    return `Dang, you’re on a roll! 🌈 Your vibe is magnetic and I’m loving the glow-up. ${compliment ? 'You are so ' + compliment + '!' : 'Keep flexing that talent, heartbreaker! 💖✨'}`;
  } else if (avgRating >= 5) {
    return `Ooo, look at you racking up those stars! 🌟 ${compliment ? 'You’re looking extra ' + compliment + ' today!' : ''} You keep this up and I might just have to write you a love song. 😉 Keep shining, superstar!`;
  } else if (avgRating >= 3) {
    return "You’re making moves! 🚀 Every step counts, and I see you putting in the work. Keep at it—your moment’s coming!";
  } else {
    return "Yo! 🎤 Keep grinding, your next big moment is just around the corner. I’m here if you need a boost! 🤙";
  }
}

// Helper: Remove emojis (same as in corey-emoji-toggle.js)
function stripEmojis(text) {
  return text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '');
}
