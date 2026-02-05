// Firebase Authentication Configuration for MusicConnectZ
// Replace these with your actual Firebase project credentials

const firebaseConfig = {
  apiKey: "AIzaSyC2qicyO0AH-rcQLtmcl3XPLgheLnrRHtk",
  authDomain: "music-connectz-6b173.firebaseapp.com",
  projectId: "music-connectz-6b173",
  storageBucket: "music-connectz-6b173.appspot.com",
  messagingSenderId: "819478392361",
  appId: "1:819478392361:web:d3a0e30c30c9b964a23638",
  measurementId: "G-956LLBDQYQ"
};

// Initialize Firebase
let auth = null;
let currentUser = null;

// Initialize when Firebase SDK loads
function initializeFirebase() {
  if (typeof firebase === 'undefined') {
    console.warn('Firebase SDK not loaded yet');
    return;
  }
  
  try {
    // Avoid double-initialization when the script is loaded/executed multiple times
    if (!firebase.apps || !firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
      console.log('✓ Firebase initialized (new app)');
    } else {
      console.log('✓ Firebase already initialized, using existing app');
    }
    auth = firebase.auth();
    
    // Listen for auth state changes
    auth.onAuthStateChanged((user) => {
      if (user) {
        currentUser = user;
        handleFirebaseLogin(user);
      } else {
        currentUser = null;
        if (appState.auth?.isAuthenticated) {
          handleLogout();
        }
      }
    });
    
    console.log('✓ Firebase initialized');
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
}

// Expose auth and helpers for other inline scripts that reference them
if (typeof window !== 'undefined') {
  window.firebaseConfig = firebaseConfig;
  window.initializeFirebase = initializeFirebase;
  window.signInWithGoogle = signInWithGoogle;
  window.signInWithFacebook = signInWithFacebook;
  window.signInWithApple = signInWithApple;
  window.signInWithGitHub = signInWithGitHub;
  window.signUpWithEmail = signUpWithEmail;
  window.signInWithEmail = signInWithEmail;
  window.sendPasswordReset = sendPasswordReset;
  window.firebaseSignOut = firebaseSignOut;
}

// Google Sign-In
async function signInWithGoogle() {
  if (!auth) {
    alert('⏳ Firebase is loading, please try again in a moment');
    return;
  }
  
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    const result = await auth.signInWithPopup(provider);
    return result.user;
  } catch (error) {
    console.error('Google sign-in error:', error);
    alert('❌ Google sign-in failed: ' + error.message);
  }
}

// Facebook Sign-In
async function signInWithFacebook() {
  if (!auth) {
    alert('⏳ Firebase is loading, please try again in a moment');
    return;
  }
  
  try {
    const provider = new firebase.auth.FacebookAuthProvider();
    provider.addScope('public_profile');
    provider.addScope('email');
    const result = await auth.signInWithPopup(provider);
    return result.user;
  } catch (error) {
    console.error('Facebook sign-in error:', error);
    alert('❌ Facebook sign-in failed: ' + error.message);
  }
}

// Apple Sign-In
async function signInWithApple() {
  if (!auth) {
    alert('⏳ Firebase is loading, please try again in a moment');
    return;
  }
  
  try {
    const provider = new firebase.auth.OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    const result = await auth.signInWithPopup(provider);
    return result.user;
  } catch (error) {
    console.error('Apple sign-in error:', error);
    alert('❌ Apple sign-in failed: ' + error.message);
  }
}

// GitHub Sign-In
async function signInWithGitHub() {
  if (!auth) {
    alert('⏳ Firebase is loading, please try again in a moment');
    return;
  }
  
  try {
    const provider = new firebase.auth.GithubAuthProvider();
    provider.addScope('user:email');
    const result = await auth.signInWithPopup(provider);
    return result.user;
  } catch (error) {
    console.error('GitHub sign-in error:', error);
    alert('❌ GitHub sign-in failed: ' + error.message);
  }
}

// Handle successful Firebase login
function handleFirebaseLogin(user) {
  // Update app state
  appState.auth = {
    isAuthenticated: true,
    provider: user.providerData[0]?.providerId || 'unknown',
    uid: user.uid
  };
  
  // Pre-fill user data if not already set
  if (!appState.user.email) {
    appState.user.email = user.email || '';
  }
  if (!appState.user.username) {
    appState.user.username = user.displayName || user.email?.split('@')[0] || '';
    document.getElementById('username').value = appState.user.username;
  }
  if (user.photoURL && !appState.user.profilePicUrl) {
    appState.user.profilePicUrl = user.photoURL;
    document.getElementById('headerPic').innerHTML = `<img src="${user.photoURL}" />`;
  }
  
  // Update UI
  updateAuthUI();
  closeLoginModal();
  
  alert(`✓ Signed in with ${user.providerData[0]?.providerId || 'OAuth'}!`);
  console.log('Firebase user:', user);
}

// Email/Password Sign-Up
async function signUpWithEmail(email, password) {
  if (!auth) {
    alert('⏳ Firebase is loading, please try again in a moment');
    return;
  }
  
  try {
    const result = await auth.createUserWithEmailAndPassword(email, password);
    alert('✓ Account created successfully!');
    return result.user;
  } catch (error) {
    console.error('Sign-up error:', error);
    if (error.code === 'auth/email-already-in-use') {
      alert('❌ Email already registered. Try logging in instead.');
    } else if (error.code === 'auth/weak-password') {
      alert('❌ Password should be at least 6 characters.');
    } else {
      alert('❌ Sign-up failed: ' + error.message);
    }
  }
}

// Email/Password Sign-In
async function signInWithEmail(email, password) {
  if (!auth) {
    alert('⏳ Firebase is loading, please try again in a moment');
    return;
  }
  
  try {
    const result = await auth.signInWithEmailAndPassword(email, password);
    return result.user;
  } catch (error) {
    console.error('Sign-in error:', error);
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      alert('❌ Invalid email or password.');
    } else {
      alert('❌ Sign-in failed: ' + error.message);
    }
  }
}

// Password Reset
async function sendPasswordReset(email) {
  if (!auth) {
    alert('⏳ Firebase is loading, please try again in a moment');
    return;
  }
  
  try {
    await auth.sendPasswordResetEmail(email);
    alert('✓ Password reset email sent! Check your inbox.');
    return true;
  } catch (error) {
    console.error('Password reset error:', error);
    if (error.code === 'auth/user-not-found') {
      alert('❌ No account found with that email.');
    } else {
      alert('❌ Password reset failed: ' + error.message);
    }
    return false;
  }
}

// Sign out
async function firebaseSignOut() {
  if (auth && currentUser) {
    try {
      await auth.signOut();
      console.log('✓ Firebase sign-out successful');
    } catch (error) {
      console.error('Sign-out error:', error);
    }
  }
}
