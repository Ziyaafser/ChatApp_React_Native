import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import {
    getReactNativePersistence,
    initializeAuth,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCKYCE2yfXymgQQ4l0X7GiTwGsbJjnfUq8',
  authDomain: 'chatapp-51a52.firebaseapp.com',
  projectId: 'chatapp-51a52',
  storageBucket: 'chatapp-51a52.firebasestorage.app',
  messagingSenderId: '95578976079',
  appId: '1:95578976079:web:cf8c6eee8eab7d50d09f3a',
  measurementId: 'G-SG7HC13PW4',
};

const app = initializeApp(firebaseConfig);

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

const db = getFirestore(app);

export { auth, db };



