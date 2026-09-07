import { getApp } from "@react-native-firebase/app";
import {
  ReactNativeFirebaseAppCheckProvider,
  initializeAppCheck,
} from "@react-native-firebase/app-check";

let bootstrapPromise: Promise<void> | null = null;

async function bootstrap(): Promise<void> {
  const provider = new ReactNativeFirebaseAppCheckProvider();

  provider.configure({
    android: {
      provider: __DEV__ ? "debug" : "playIntegrity",
    },
    apple: {
      provider: __DEV__ ? "debug" : "appAttestWithDeviceCheckFallback",
    },
  });

  await initializeAppCheck(getApp(), {
    provider,
    isTokenAutoRefreshEnabled: true,
  });
}

export function bootstrapFirebase(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = bootstrap();
  }

  return bootstrapPromise;
}
