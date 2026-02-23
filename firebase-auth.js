// firebase-auth.js
// Add Firebase Authentication to your app
// Requires firebase-app.js, firebase-auth.js, firebase-config.js, and firebase-init.js to be loaded first


const BACKEND_URL = 'https://music-connectz-backend-2.onrender.com';

// Sign up using backend
function signUp(email, password, name) {
  return fetch(`${BACKEND_URL}/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, name }),
  })
    .then(async (response) => {
      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Sign up failed');
        throw new Error(error.error || 'Sign up failed');
      }
      alert('Sign up successful!');
      return response.json();
    });
}

// Sign in using backend
function signIn(email, password) {
  return fetch(`${BACKEND_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })
    .then(async (response) => {
      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Sign in failed');
        throw new Error(error.error || 'Sign in failed');
      }
      alert('Sign in successful!');
      return response.json();
    });
}

// Sign out (client-side only, since backend is stateless)
function signOut() {
  // If you use tokens/cookies, clear them here
  alert('Signed out!');
}
