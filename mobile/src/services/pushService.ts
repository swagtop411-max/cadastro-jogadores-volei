import { getFirestore, doc, serverTimestamp, setDoc } from "@react-native-firebase/firestore";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const db = getFirestore();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function tokenDocumentId(token: string) {
  return token.replace(/[^a-zA-Z0-9_-]/g, "_").slice(-180);
}

export async function registerPushNotifications(uid: string) {
  if (!uid) return null;
  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("social", {
      name: "Atividades sociais",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 180, 90, 180],
      lightColor: "#18D5FF",
      sound: "default",
    });
  }

  const projectId = Constants.easConfig?.projectId || Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) return null;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  if (!token) return null;

  await setDoc(doc(db, "push_tokens", uid, "devices", tokenDocumentId(token)), {
    uid,
    expoPushToken: token,
    platform: Platform.OS,
    channel: "social",
    updatedAt: serverTimestamp(),
  }, { merge: true });
  return token;
}

export function subscribePushResponse(onRoute: (route: string) => void) {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data || {};
    const route = typeof data.route === "string" ? data.route : "";
    if (route.startsWith("/")) onRoute(route);
  });
  return () => subscription.remove();
}
