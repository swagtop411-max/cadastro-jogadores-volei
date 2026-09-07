export const APP_ENVIRONMENTS = ["development", "preview", "production"] as const;

export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];

export interface AppEnvironmentConfig {
  name: AppEnvironment;
  isProduction: boolean;
  enableDebugLogging: boolean;
  useAppCheckDebugProvider: boolean;
}

export function parseAppEnvironment(value?: string): AppEnvironment {
  if (value && APP_ENVIRONMENTS.includes(value as AppEnvironment)) {
    return value as AppEnvironment;
  }

  return "development";
}

export function getAppEnvironmentConfig(value?: string): AppEnvironmentConfig {
  const name = parseAppEnvironment(value);
  const isProduction = name === "production";

  return {
    name,
    isProduction,
    enableDebugLogging: !isProduction,
    useAppCheckDebugProvider: !isProduction,
  };
}
