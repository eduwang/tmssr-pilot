// Firebase v9 모듈 방식
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";  // 🔹 Firestore import 추가

// 여기에 Firebase 콘솔에서 받은 설정값을 입력하세요
const firebaseConfig = {
  apiKey: "AIzaSyBlzOpkzIFeMpHEqKCaFZdqmdRQpv919bQ",
  authDomain: "tmssr-pilot.firebaseapp.com",
  projectId: "tmssr-pilot",
  storageBucket: "tmssr-pilot.firebasestorage.app",
  messagingSenderId: "386506061483",
  appId: "1:386506061483:web:d635f580c037b5640769ee",
  measurementId: "G-QTJ7X6VCWK"
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// Auth 관련 객체
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Firestore DB 객체 생성
const db = getFirestore(app);  // 🔹 명시적으로 app 전달

export { app, auth, provider, firebaseConfig, db  }; // ✅ 추가됨
