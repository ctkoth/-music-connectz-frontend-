// Firebase Authentication Configuration for MusicConnectZ
// Replace these with your actual Firebase project credentials

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
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
    firebase.initializeApp(firebaseConfig);
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
