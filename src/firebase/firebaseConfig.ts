import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    deleteDoc,
    query,
    orderBy,
    limit,
    where,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: 'AIzaSyA-uChyLIzO6vmW38QUCr23Qmp2VD4tDGQ',
    authDomain: 'suikagame-f0b3a.firebaseapp.com',
    projectId: 'suikagame-f0b3a',
    storageBucket: 'suikagame-f0b3a.firebasestorage.app',
    messagingSenderId: '458203127958',
    appId: '1:458203127958:web:05f1244b905f6e8efce2b7',
    measurementId: 'G-WW73CP8B35',
};
// Firebase 초기화
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);

// 컬렉션 참조 헬퍼
export const sessionsRef = collection(db, 'sessions');
export const scoresRef = collection(db, 'scores');

export {
    doc,
    setDoc,
    getDoc,
    getDocs,
    deleteDoc,
    query,
    orderBy,
    limit,
    where,
    serverTimestamp,
    Timestamp,
};
