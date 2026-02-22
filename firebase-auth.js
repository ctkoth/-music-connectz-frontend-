// firebase-auth.js
// Add Firebase Authentication to your app
// Requires firebase-app.js, firebase-auth.js, firebase-config.js, and firebase-init.js to be loaded first

const auth = firebase.auth();

// Example: Simple email/password sign up
function signUp(email, password) {
  return auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      // Signed up
      const user = userCredential.user;
      alert('Sign up successful!');
      return user;
    })
    .catch((error) => {
      alert(error.message);
      throw error;
    });
}

// Example: Simple email/password sign in
function signIn(email, password) {
  return auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      // Signed in
      const user = userCredential.user;
      alert('Sign in successful!');
      return user;
    })
    .catch((error) => {
      alert(error.message);
      throw error;
    });
}

// Example: Sign out
function signOut() {
  return auth.signOut()
    .then(() => {
      alert('Signed out!');
    })
    .catch((error) => {
      alert(error.message);
    });
}
