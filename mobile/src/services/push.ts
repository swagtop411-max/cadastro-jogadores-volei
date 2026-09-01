import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '@/src/config/firebase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

export type PushRegistrationResult =
  | { status: 'registered'; token: string }
  | { status: 'permission-denied' }
  | { status: 'needs-eas-project-id' }
  | { status: 'firestore-rules-pending'; token: string }
  | { status: 'unavailable'; reason: string };

function tokenDocumentId(token: string) {
  return token.replace(/[^a-zA-Z0-9_-]/g, '_').slice(-180) || `device_${Date.now()}`;
}

export async function registerPushToken(uid: string): Promise<PushRegistrationResult> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('social', {
        name: 'Atividade social',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 180, 100, 180],
      });
    }

    let permission = await Notifications.getPermissionsAsync();
    if (permission.status !== 'granted') permission = await Notifications.requestPermissionsAsync();
    if (permission.status !== 'granted') return { status: 'permission-denied' };

    const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim();
    if (!projectId) return { status: 'needs-eas-project-id' };

    const expoToken = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = expoToken.data;
    try {
      await setDoc(doc(db, 'push_tokens', uid, 'devices', tokenDocumentId(token)), {
        uid,
        token,
        provider: 'expo',
        platform: Platform.OS,
        ativo: true,
        atualizadoEm: serverTimestamp(),
        criadoEm: serverTimestamp(),
      }, { merge: true });
      return { status: 'registered', token };
    } catch (error: any) {
      if (String(error?.code || '').includes('permission-denied')) return { status: 'firestore-rules-pending', token };
      throw error;
    }
  } catch (error: any) {
    return { status: 'unavailable', reason: error?.message || 'Push indisponível neste dispositivo.' };
  }
}
