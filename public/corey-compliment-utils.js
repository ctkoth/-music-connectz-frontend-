// Helper: Get compliment word based on gender and language
function getComplimentWord(gender, language, age) {
  const compliments = {
    en: {
      female: ['beautiful', 'cute', 'sexy'],
      male: ['handsome', 'cute', 'sexy'],
      other: ['amazing', 'cute', 'sexy'],
    },
    es: {
      female: ['hermosa', 'linda', 'sexy'],
      male: ['guapo', 'bonito', 'sexy'],
      other: ['increíble', 'lindo', 'sexy'],
    },
    ja: {
      female: ['美しい', 'かわいい', 'セクシー'],
      male: ['ハンサム', 'かわいい', 'セクシー'],
      other: ['素晴らしい', 'かわいい', 'セクシー'],
    },
    zh: {
      female: ['美丽', '可爱', '性感'],
      male: ['英俊', '可爱', '性感'],
      other: ['了不起', '可爱', '性感'],
    },
    pt: {
      female: ['linda', 'fofa', 'sexy'],
      male: ['bonito', 'fofo', 'sexy'],
      other: ['incrível', 'fofo', 'sexy'],
    },
  };
  const lang = compliments[language] ? language : 'en';
  let arr;
  if (gender === 'female') arr = compliments[lang].female;
  else if (gender === 'male') arr = compliments[lang].male;
  else arr = compliments[lang].other;
  // Only use 'sexy' if age > 12
  if (typeof age === 'number' && age <= 12) {
    arr = arr.filter(word => word !== 'sexy' && word !== 'セクシー' && word !== '性感');
  }
  // Randomly pick one compliment
  return arr[Math.floor(Math.random() * arr.length)];
}

// Fetch user profile (gender, language)
function fetchUserProfile(userId) {
  return fetch(`${window.MCZ_CONFIG.backendUrl}/api/user/${userId}/profile/`, { credentials: 'include' })
    .then(res => res.json())
    .catch(() => ({ gender: 'other', language: 'en', age: 0 }));
}
