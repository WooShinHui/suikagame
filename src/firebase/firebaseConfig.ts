import { initializeApp } from 'firebase/app';
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    query,
    orderBy,
    limit,
    where,
    serverTimestamp,
    Timestamp,
} from 'firebase/firestore';

// ✅ Firebase Console에서 복사한 설정
const firebaseConfig = {
    apiKey: 'YOUR_API_KEY',
    authDomain: 'suikagame.firebaseapp.com',
    projectId: 'suikagame',
    storageBucket: 'suikagame.appspot.com',
    messagingSenderId: '123456789',
    appId: '1:123456789:web:abcdef',
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// 컬렉션 참조 헬퍼
export const sessionsRef = collection(db, 'sessions');
export const scoresRef = collection(db, 'scores');

export {
    doc,
    setDoc,
    getDoc,
    getDocs,
    query,
    orderBy,
    limit,
    where,
    serverTimestamp,
    Timestamp,
};
