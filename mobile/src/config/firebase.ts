import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
// O Firebase publica getReactNativePersistence no bundle React Native, mas o resolvedor
// TypeScript ainda pode enxergar apenas as declarações web do mesmo entry point.
// @ts-expect-error Export disponível no bundle RN selecionado pelo Metro/Expo.
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBMsuR0320Nz3asVRj5axXFvKJ5Ftz9COQ',
  authDomain: 'jogadores-de-volei.firebaseapp.com',
  projectId: 'jogadores-de-volei',
  storageBucket: 'jogadores-de-volei.firebasestorage.app',
  messagingSenderId: '48728914064',
  appId: '1:48728914064:web:1dd7aeb705319886f74015',
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = (() => {
  try {
    return initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    return getAuth(firebaseApp);
  }
})();

export const db = getFirestore(firebaseApp);
