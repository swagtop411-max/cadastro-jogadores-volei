import fs from "node:fs";

const localGoogleServicesUrl = new URL("./google-services.json", import.meta.url);
const localGoogleServiceInfoUrl = new URL("./GoogleService-Info.plist", import.meta.url);

const androidGoogleServicesFile =
  process.env.GOOGLE_SERVICES_JSON ??
  (fs.existsSync(localGoogleServicesUrl) ? "./google-services.json" : undefined);

const iosGoogleServicesFile =
  process.env.GOOGLE_SERVICE_INFO_PLIST ??
  (fs.existsSync(localGoogleServiceInfoUrl) ? "./GoogleService-Info.plist" : undefined);

export default ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    ...(androidGoogleServicesFile
      ? { googleServicesFile: androidGoogleServicesFile }
      : {}),
  },
  ios: {
    ...config.ios,
    ...(iosGoogleServicesFile
      ? { googleServicesFile: iosGoogleServicesFile }
      : {}),
  },
});
