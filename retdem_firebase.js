// retdem_firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail, setPersistence, browserLocalPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, getDoc, query, where, deleteDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyB3nbYnqOVebLraBrj76apXR8iUczrSMpQ",
    authDomain: "retdem-ber-me.firebaseapp.com",
    projectId: "retdem-ber-me",
    storageBucket: "retdem-ber-me.firebasestorage.app",
    messagingSenderId: "815428429864",
    appId: "1:815428429864:web:dc288d269e95d338a66d1d",
    measurementId: "G-EK38L04RBE"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail, setPersistence, browserLocalPersistence, browserSessionPersistence, collection, addDoc, getDocs, doc, setDoc, getDoc, query, where, deleteDoc, updateDoc };
