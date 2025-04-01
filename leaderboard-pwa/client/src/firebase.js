// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy, doc, setDoc } from 'firebase/firestore';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAdsv6mzFIoU5cM2G0cTaygn0uHhPtST2o",
  authDomain: "leaderboardpwa.firebaseapp.com",
  projectId: "leaderboardpwa",
  storageBucket: "leaderboardpwa.firebasestorage.app",
  messagingSenderId: "238918068018",
  appId: "1:238918068018:web:01ded9ac5450ea0457d92b",
  measurementId: "G-95HDC2YZ2S"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// Authentication functions
export const signup = (email, password) => createUserWithEmailAndPassword(auth, email, password);
export const login = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const logout = () => signOut(auth);
export const onAuthChange = (callback) => onAuthStateChanged(auth, callback);

// Add a new function to store user data in Firestore
export const addUserToFirestore = async (userId, userData) => {
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, userData);
      console.log("User added to Firestore successfully:", userData);
    } catch (error) {
      console.error("Error adding user to Firestore:", error);
      throw error;
    }
  };

// List of moderator emails
const MODERATOR_EMAILS = [
  'elijahxabas@gmail.com',
  'mod@example.com'
  // Add your moderator emails here
];

// Function to check if a user is a moderator
export const checkIfModerator = (userEmail) => {
  return MODERATOR_EMAILS.includes(userEmail.toLowerCase());
};

// Firestore functions
export const getLeaderboard = async () => {
  try {
    const q = query(collection(db, 'users'), orderBy('balance', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting leaderboard:", error);
    return [];
  }
};

export const requestBalanceUpdate = async (userId, name, newBalance) => {
  await addDoc(collection(db, 'pending_updates'), { userId, name, newBalance });
};

export const getPendingUpdates = async () => {
  const snapshot = await getDocs(collection(db, 'pending_updates'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const approveBalanceUpdate = async (updateId, userId, newBalance) => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { balance: newBalance });
  await deleteDoc(doc(db, 'pending_updates', updateId));
};

export { app, analytics, auth, db };