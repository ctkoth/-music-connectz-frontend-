function initializeFirebase() {
	if (!window.firebaseConfig) {
		console.error('Firebase config not found!');
		return null;
	}
	const app = firebase.initializeApp(window.firebaseConfig);
	const analytics = firebase.analytics(app);
	// Add any other Firebase services you need here
	return app;
}
// firebase-init.js
// Initialize Firebase using the config from firebase-config.js
const app = firebase.initializeApp(window.firebaseConfig);
const analytics = firebase.analytics(app);
// Now you can use Firebase services, e.g.:
// const auth = firebase.auth();
// const db = firebase.firestore();
