import {defineConfig,devices} from "@playwright/test";

export default defineConfig({
  testDir:"./tests/playwright",
  timeout:45_000,
  expect:{timeout:10_000},
  fullyParallel:false,
  retries:1,
  reporter:[["list"],["html",{outputFolder:"playwright-report",open:"never"}]],
  use:{
    baseURL:process.env.PLAY_BASE_URL||"https://cadastrodeatletas.com.br",
    trace:"retain-on-failure",
    screenshot:"only-on-failure",
    video:"retain-on-failure",
    locale:"pt-BR",
    ...devices["Pixel 7"]
  }
});
