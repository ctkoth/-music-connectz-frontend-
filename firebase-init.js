// firebase-init.js
// Initialize Firebase using the config from firebase-config.js
const app = firebase.initializeApp(window.firebaseConfig);
const analytics = firebase.analytics(app);
// Now you can use Firebase services, e.g.:
// const auth = firebase.auth();
// const db = firebase.firestore();
